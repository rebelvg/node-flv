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

export class FlvStreamParser extends Writable {
  constructor() {
    super();

    this._bytes(FLV_READ_FOR_HEADER, this.onHeader);
  }

  private _bytes(bytesLength: number, cb: Function): void {
    super['_bytes'](bytesLength, cb);
  }

  private _skipBytes(bytesLength: number, cb: Function): void {
    super['_skipBytes'](bytesLength, cb);
  }

  public onHeader(rawHeader: Buffer, output: () => void) {
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

    output();
  }

  public onPacketHeader(rawPacketHeader: Buffer, output: () => void) {
    const flvPacketHeader = new FlvPacketHeader(rawPacketHeader);

    this._bytes(
      flvPacketHeader.payloadSize,
      (rawPacketBody: Buffer, output: () => void) => {
        const flvPacket = new FlvPacket(flvPacketHeader, rawPacketBody);

        this.emitTypedPacket(flvPacket);

        this._skipBytes(FLV_READ_FOR_PACKET_PREVIOUS_PACKET_SIZE, () => {
          this._bytes(FLV_READ_FOR_PACKET_HEADER, this.onPacketHeader);
        });

        output();
      },
    );

    output();
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
