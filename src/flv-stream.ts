import { Writable } from 'stream';
import * as StreamParser from 'stream-parser';

import {
  FlvHeader,
  FlvPacketHeader,
  FlvPacket,
  FlvPacketType,
  FlvPacketAudio,
  FlvPacketVideo,
  FlvPacketMetadata
} from './flv';

const FLV_HEADER_SIZE_BYTES_V1 = 9;
const FLV_PACKET_HEADER_SIZE_BYTES_V1 = 15;

export class FlvStreamParser extends Writable {
  constructor() {
    super();

    this._bytes(FLV_HEADER_SIZE_BYTES_V1, this.onHeader);
  }

  private _bytes(bytesLength: number, cb: Function): void {
    super['_bytes'](bytesLength, cb);
  }

  private _skipBytes(bytesLength: number, cb: Function): void {
    super['_skipBytes'](bytesLength, cb);
  }

  public onHeader(headerPayload: Buffer, output: () => void) {
    const flvHeader = new FlvHeader(headerPayload);

    this.emit('flv-header', flvHeader);

    if (flvHeader.headerSize !== FLV_HEADER_SIZE_BYTES_V1) {
      this._skipBytes(flvHeader.headerSize - FLV_HEADER_SIZE_BYTES_V1, () => {
        this._bytes(FLV_PACKET_HEADER_SIZE_BYTES_V1, this.onPacketHeader);
      });
    } else {
      this._bytes(FLV_PACKET_HEADER_SIZE_BYTES_V1, this.onPacketHeader);
    }

    output();
  }

  public onPacketHeader(packetHeaderPayload: Buffer, output: () => void) {
    const flvPacketHeader = new FlvPacketHeader(packetHeaderPayload);

    this._bytes(flvPacketHeader.payloadSize, (packetBodyPayload: Buffer, output: () => void) => {
      const flvPacket = new FlvPacket(flvPacketHeader, packetBodyPayload);

      this.emit('flv-packet', flvPacket);

      this.emitTypedPacket(flvPacket);

      this._bytes(FLV_PACKET_HEADER_SIZE_BYTES_V1, this.onPacketHeader);

      output();
    });

    output();
  }

  private emitTypedPacket(flvPacket: FlvPacket) {
    switch (flvPacket.header.type) {
      case FlvPacketType.AUDIO: {
        return this.emit('flv-packet-audio', new FlvPacketAudio(flvPacket));
      }
      case FlvPacketType.VIDEO: {
        return this.emit('flv-packet-video', new FlvPacketVideo(flvPacket));
      }
      case FlvPacketType.METADATA: {
        return this.emit('flv-packet-metadata', new FlvPacketMetadata(flvPacket));
      }
      default: {
        return this.emit('flv-packet-unknown', flvPacket);
      }
    }
  }
}

StreamParser(FlvStreamParser.prototype);
