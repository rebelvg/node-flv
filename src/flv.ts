import { IAudioData, IVideoData, IMetadataData, parseAudio, parseVideo, parseMetadata } from './flv-data';

export enum FlvPacketType {
  AUDIO = 'audio',
  VIDEO = 'video',
  METADATA = 'metadata',
  UNKNOWN = 'unknown'
}

export const FLV_HEADER_SIZE_BYTES_V1 = 9;
export const FLV_PACKET_PREVIOUS_PACKET_SIZE_BYTES_V1 = 4;
export const FLV_PACKET_HEADER_SIZE_BYTES_V1 = 11;

export class FlvHeader {
  public readonly signature: string;
  public readonly version: number;
  public readonly flags: number;
  public readonly headerSize: number;

  constructor(rawBuffer: Buffer) {
    const signature = rawBuffer.toString('utf8', 0, 3);
    const version = rawBuffer.readUInt8(3);
    const flags = rawBuffer.readUInt8(4);
    const headerSize = rawBuffer.readUInt32BE(5);

    if (signature !== 'FLV') {
      throw new Error('Not FLV.');
    }

    this.signature = signature;
    this.version = version;
    this.flags = flags;
    this.headerSize = headerSize;
  }

  public build(): Buffer {
    const rawBuffer = Buffer.alloc(this.headerSize);

    rawBuffer.write(this.signature);
    rawBuffer.writeUInt8(this.version, 3);
    rawBuffer.writeUInt8(this.flags, 4);
    rawBuffer.writeUInt32BE(this.headerSize, 5);

    return rawBuffer;
  }
}

export class FlvPacketHeader {
  public prevPacketSize: number;
  public packetType: number;
  public payloadSize: number;
  public timestampLower: number;
  public timestampUpper: number;
  public streamId: number;

  private _size: number;

  constructor(rawBuffer: Buffer) {
    this.prevPacketSize = rawBuffer.readUInt32BE(0);
    this.packetType = rawBuffer.readUInt8(4);
    this.payloadSize = rawBuffer.readUIntBE(5, 3);
    this.timestampLower = rawBuffer.readUIntBE(8, 3);
    this.timestampUpper = rawBuffer.readUInt8(11);
    this.streamId = rawBuffer.readUIntBE(12, 3);

    this._size = rawBuffer.length;
  }

  get type(): FlvPacketType {
    switch (this.packetType) {
      case 8: {
        return FlvPacketType.AUDIO;
      }
      case 9: {
        return FlvPacketType.VIDEO;
      }
      case 18: {
        return FlvPacketType.METADATA;
      }
      default: {
        return FlvPacketType.UNKNOWN;
      }
    }
  }

  get size() {
    return FLV_PACKET_HEADER_SIZE_BYTES_V1;
  }

  public build(): Buffer {
    const rawBuffer = Buffer.alloc(this._size);

    rawBuffer.writeUInt32BE(this.prevPacketSize, 0);
    rawBuffer.writeUInt8(this.packetType, 4);
    rawBuffer.writeUIntBE(this.payloadSize, 5, 3);
    rawBuffer.writeUIntBE(this.timestampLower, 8, 3);
    rawBuffer.writeUInt8(this.timestampUpper, 11);
    rawBuffer.writeUIntBE(this.streamId, 12, 3);

    return rawBuffer;
  }
}

export class FlvPacket {
  public readonly header: FlvPacketHeader;
  public readonly payload: Buffer;

  constructor(flvPacketHeader: FlvPacketHeader, payload: Buffer) {
    this.header = flvPacketHeader;
    this.payload = payload;
  }

  public parsePayload() {
    switch (this.header.type) {
      case FlvPacketType.AUDIO: {
        return new FlvPacketAudio(this);
      }
      case FlvPacketType.VIDEO: {
        return new FlvPacketVideo(this);
      }
      case FlvPacketType.METADATA: {
        return new FlvPacketMetadata(this);
      }
      default: {
        return this;
      }
    }
  }

  get size(): number {
    return this.header.size + this.payload.length;
  }

  public build(): Buffer {
    return Buffer.concat([this.header.build(), this.payload]);
  }
}

export class FlvPacketAudio extends FlvPacket {
  public readonly data: IAudioData;

  constructor({ header, payload }: FlvPacket) {
    super(header, payload);

    this.data = parseAudio(payload);
  }
}

export class FlvPacketVideo extends FlvPacket {
  public readonly data: IVideoData;

  constructor({ header, payload }: FlvPacket) {
    super(header, payload);

    this.data = parseVideo(payload);
  }
}

export class FlvPacketMetadata extends FlvPacket {
  public readonly data: IMetadataData;

  constructor({ header, payload }: FlvPacket) {
    super(header, payload);

    this.data = parseMetadata(payload);
  }
}
