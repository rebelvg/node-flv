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

  constructor(rawHeader: Buffer) {
    const signature = rawHeader.toString('utf8', 0, 3);
    const version = rawHeader.readUInt8(3);
    const flags = rawHeader.readUInt8(4);
    const headerSize = rawHeader.readUInt32BE(5);

    if (signature !== 'FLV') {
      throw new Error('Not FLV.');
    }

    this.signature = signature;
    this.version = version;
    this.flags = flags;
    this.headerSize = headerSize;
  }

  public build(): Buffer {
    const rawBuffer = Buffer.alloc(this.headerSize + FLV_PACKET_PREVIOUS_PACKET_SIZE_BYTES_V1);

    rawBuffer.write(this.signature);
    rawBuffer.writeUInt8(this.version, 3);
    rawBuffer.writeUInt8(this.flags, 4);
    rawBuffer.writeUInt32BE(this.headerSize, 5);
    rawBuffer.writeUInt32BE(0, 9);

    return rawBuffer;
  }
}

export class FlvPacketHeader {
  public packetType: number;
  public payloadSize: number;
  public timestampLower: number;
  public timestampUpper: number;
  public streamId: number;

  private _size: number;

  constructor(rawPacketHeader: Buffer) {
    this.packetType = rawPacketHeader.readUInt8(0);
    this.payloadSize = rawPacketHeader.readUIntBE(1, 3);
    this.timestampLower = rawPacketHeader.readUIntBE(4, 3);
    this.timestampUpper = rawPacketHeader.readUInt8(7);
    this.streamId = rawPacketHeader.readUIntBE(8, 3);

    this._size = rawPacketHeader.length;
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
    return this._size;
  }

  public build(): Buffer {
    const rawBuffer = Buffer.alloc(this._size);

    rawBuffer.writeUInt8(this.packetType, 0);
    rawBuffer.writeUIntBE(this.payloadSize, 1, 3);
    rawBuffer.writeUIntBE(this.timestampLower, 4, 3);
    rawBuffer.writeUInt8(this.timestampUpper, 7);
    rawBuffer.writeUIntBE(this.streamId, 8, 3);

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
    const prevPacketSize = Buffer.alloc(4);
    prevPacketSize.writeUInt32BE(this.size, 0);

    return Buffer.concat([this.header.build(), this.payload, prevPacketSize]);
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
