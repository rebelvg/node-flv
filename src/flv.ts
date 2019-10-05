import { IAudioData, IVideoData, IMetadataData, parseAudio, parseVideo, parseMetadata } from './flv-data';

export enum PacketTypeEnum {
  AUDIO = 'audio',
  VIDEO = 'video',
  METADATA = 'metadata',
  UNKNOWN = 'unknown'
}

export class FlvHeader {
  public readonly payload: Buffer;

  public readonly signature: string;
  public readonly version: number;
  public readonly flags: number;
  public readonly headerSize: number;

  constructor(payload: Buffer) {
    this.payload = payload;

    const signature = payload.toString('utf8', 0, 3);
    const version = payload.readUInt8(3);
    const flags = payload.readUInt8(4);
    const headerSize = payload.readUInt32BE(5);

    if (signature !== 'FLV') {
      throw new Error('Not FLV.');
    }

    this.signature = signature;
    this.version = version;
    this.flags = flags;
    this.headerSize = headerSize;
  }

  public buildHeader(): Buffer {
    const payload = Buffer.alloc(this.headerSize);

    payload.write(this.signature);
    payload.writeUInt8(this.version, 3);
    payload.writeUInt8(this.flags, 4);
    payload.writeUInt32BE(this.headerSize, 5);

    return payload;
  }
}

export class FlvPacketHeader {
  public readonly payload: Buffer;

  public prevPacketSize: number;
  public packetType: number;
  public payloadSize: number;
  public timestampLower: number;
  public timestampUpper: number;
  public streamId: number;

  constructor(payload: Buffer) {
    this.payload = payload;

    this.prevPacketSize = payload.readUInt32BE(0);
    this.packetType = payload.readUInt8(4);
    this.payloadSize = payload.readUIntBE(5, 3);
    this.timestampLower = payload.readUIntBE(8, 3);
    this.timestampUpper = payload.readUInt8(11);
    this.streamId = payload.readUIntBE(12, 3);
  }

  get packetTypeEnum(): PacketTypeEnum {
    switch (this.packetType) {
      case 8: {
        return PacketTypeEnum.AUDIO;
      }
      case 9: {
        return PacketTypeEnum.VIDEO;
      }
      case 18: {
        return PacketTypeEnum.METADATA;
      }
      default: {
        return PacketTypeEnum.UNKNOWN;
      }
    }
  }

  public buildPacketHeader(): Buffer {
    const payload = Buffer.alloc(15);

    payload.writeUInt32BE(this.prevPacketSize, 0);
    payload.writeUInt8(this.packetType, 4);
    payload.writeUIntBE(this.payloadSize, 5, 3);
    payload.writeUIntBE(this.timestampLower, 8, 3);
    payload.writeUInt8(this.timestampUpper, 11);
    payload.writeUIntBE(this.streamId, 12, 3);

    return payload;
  }
}

export class FlvPacket {
  public readonly flvPacketHeader: FlvPacketHeader;
  public readonly payload: Buffer;

  constructor(flvPacketHeader: FlvPacketHeader, packetBody: Buffer) {
    this.flvPacketHeader = flvPacketHeader;
    this.payload = packetBody;
  }

  public parsePayload() {
    switch (this.flvPacketHeader.packetTypeEnum) {
      case PacketTypeEnum.AUDIO: {
        return new FlvPacketAudio(this);
      }
      case PacketTypeEnum.VIDEO: {
        return new FlvPacketVideo(this);
      }
      case PacketTypeEnum.METADATA: {
        return new FlvPacketMetadata(this);
      }
      default: {
        return this;
      }
    }
  }

  get packetSize(): number {
    return this.flvPacketHeader.payload.length + this.payload.length;
  }

  public buildPacket(): Buffer {
    return Buffer.concat([this.flvPacketHeader.buildPacketHeader(), this.payload]);
  }
}

export class FlvPacketAudio extends FlvPacket {
  public readonly data: IAudioData;

  constructor({ flvPacketHeader, payload }: FlvPacket) {
    super(flvPacketHeader, payload);

    this.data = parseAudio(payload);
  }
}

export class FlvPacketVideo extends FlvPacket {
  public readonly data: IVideoData;

  constructor({ flvPacketHeader, payload }: FlvPacket) {
    super(flvPacketHeader, payload);

    this.data = parseVideo(payload);
  }
}

export class FlvPacketMetadata extends FlvPacket {
  public readonly data: IMetadataData;

  constructor({ flvPacketHeader, payload }: FlvPacket) {
    super(flvPacketHeader, payload);

    this.data = parseMetadata(payload);
  }
}
