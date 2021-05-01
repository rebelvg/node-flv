import { Writable } from 'stream';
import * as StreamParser from 'stream-parser';

import {
  FlvHeader,
  FlvPacketHeader,
  FlvPacket,
  FlvPacketType,
  FlvPacketAudio,
  FlvPacketVideo,
  FlvPacketMetadata,
  FLV_HEADER_SIZE_BYTES_V1,
  FLV_PACKET_PREVIOUS_PACKET_SIZE_BYTES_V1,
  FLV_PACKET_HEADER_SIZE_BYTES_V1,
} from './flv';

const FLV_READ_FOR_HEADER = FLV_HEADER_SIZE_BYTES_V1;
const FLV_READ_FOR_PACKET_PREVIOUS_PACKET_SIZE = FLV_PACKET_PREVIOUS_PACKET_SIZE_BYTES_V1;
const FLV_READ_FOR_PACKET_HEADER = FLV_PACKET_HEADER_SIZE_BYTES_V1;

export declare interface FlvStreamParser {
  _bytes(bytesLength: number, cb: (data: Buffer, cb: () => void) => void): void;
  _skipBytes(bytesLength: number, cb: () => void): void;
}

export class FlvStreamParser extends Writable {
  constructor() {
    super();

    this._bytes(FLV_READ_FOR_HEADER, this.onHeader);
  }

  private onHeader(rawHeader: Buffer, cb: () => void) {
    const flvHeader = new FlvHeader(rawHeader);

    this.emit('flv-header', flvHeader);

    this._skipBytes(
      flvHeader.headerSize -
        FLV_READ_FOR_HEADER +
        FLV_READ_FOR_PACKET_PREVIOUS_PACKET_SIZE,
      () => {
        this._bytes(FLV_READ_FOR_PACKET_HEADER, this.onPacketHeader);
      },
    );

    cb();
  }

  private onPacketHeader(rawPacketHeader: Buffer, cb: () => void) {
    const flvPacketHeader = new FlvPacketHeader(rawPacketHeader);

    this._bytes(
      flvPacketHeader.payloadSize,
      (rawPacketBody: Buffer, cb: () => void) => {
        const flvPacket = new FlvPacket(flvPacketHeader, rawPacketBody);

        this.emitTypedPacket(flvPacket);

        this._skipBytes(FLV_READ_FOR_PACKET_PREVIOUS_PACKET_SIZE, () => {
          this._bytes(FLV_READ_FOR_PACKET_HEADER, this.onPacketHeader);
        });

        cb();
      },
    );

    cb();
  }

  private emitTypedPacket(flvPacket: FlvPacket) {
    this.emit('flv-packet', flvPacket);

    switch (flvPacket.header.type) {
      case FlvPacketType.AUDIO: {
        return this.emit('flv-packet-audio', new FlvPacketAudio(flvPacket));
      }
      case FlvPacketType.VIDEO: {
        return this.emit('flv-packet-video', new FlvPacketVideo(flvPacket));
      }
      case FlvPacketType.METADATA: {
        return this.emit(
          'flv-packet-metadata',
          new FlvPacketMetadata(flvPacket),
        );
      }
      default: {
        return this.emit('flv-packet-unknown', flvPacket);
      }
    }
  }
}

StreamParser(FlvStreamParser.prototype);
