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

export class FlvStreamParser extends Writable {
  constructor() {
    super();

    this._bytes(9, this.onHeader);
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

    if (flvHeader.headerSize !== 9) {
      this._skipBytes(flvHeader.headerSize - 9, () => {
        this._bytes(15, this.onPacketHeader);
      });
    } else {
      this._bytes(15, this.onPacketHeader);
    }

    output();
  }

  public onPacketHeader(packetHeaderPayload: Buffer, output: () => void) {
    const flvPacketHeader = new FlvPacketHeader(packetHeaderPayload);

    this._bytes(flvPacketHeader.payloadSize, (packetBodyPayload: Buffer, output: () => void) => {
      const flvPacket = new FlvPacket(flvPacketHeader, packetBodyPayload);

      this.emit('flv-packet', flvPacket);

      this.emitTypedPacket(flvPacket);

      this._bytes(15, this.onPacketHeader);

      output();
    });

    output();
  }

  private emitTypedPacket(flvPacket: FlvPacket) {
    switch (flvPacket.flvPacketHeader.packetTypeEnum) {
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
