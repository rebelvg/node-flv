import { FlvHeader, FlvPacketHeader, FlvPacket } from './flv';
import * as StreamParser from 'stream-parser';
import { Writable } from 'stream';

export class FlvStreamParser extends Writable {
  constructor() {
    super();

    this._bytes(9, this.onHeader);
  }

  protected _bytes(bytesCount: number, cb: Function): void {
    super['_bytes'](bytesCount, cb);
  }

  protected _skipBytes(bytesCount: number, cb: Function): void {
    super['_skipBytes'](bytesCount, cb);
  }

  public onHeader(headerBuffer: Buffer, output: () => void) {
    const header = new FlvHeader(headerBuffer);

    this.emit('flv-header', header);

    if (header.headerSize !== 9) {
      this._skipBytes(header.headerSize - 9, () => {
        this._bytes(15, this.onPacketHeader);
      });
    } else {
      this._bytes(15, this.onPacketHeader);
    }

    output();
  }

  public onPacketHeader(packetHeaderBuffer: Buffer, output: () => void) {
    const packetHeader = new FlvPacketHeader(packetHeaderBuffer);

    this._bytes(packetHeader.payloadSize, (packetPayloadBuffer: Buffer, output: () => void) => {
      this.emit('flv-packet', new FlvPacket(packetHeader, packetPayloadBuffer));

      this._bytes(15, this.onPacketHeader);

      output();
    });

    output();
  }
}

StreamParser(FlvStreamParser.prototype);
