import * as fs from 'fs';
import * as path from 'path';
import { assert } from 'chai';

import {
  FlvStreamParser,
  FlvHeader,
  FlvPacket,
  FlvPacketAudio,
  FlvPacketVideo,
  FlvPacketMetadata,
} from '../../src';

describe('FlvStreamParser integration test', () => {
  describe('#FlvStreamParser', () => {
    const filePath = path.join(__dirname, '../test.flv');

    let parsedFlvHeader: FlvHeader;
    const parsedFlvPackets: FlvPacket[] = [];

    let typedPacketsCount = 0;

    before(async () => {
      const fileReadStream = fs.createReadStream(filePath);

      const flvStream = new FlvStreamParser();

      flvStream.on('flv-header', (flvHeader: FlvHeader) => {
        parsedFlvHeader = flvHeader;
      });

      flvStream.on('flv-packet', (flvPacket: FlvPacket) => {
        parsedFlvPackets.push(flvPacket);
      });

      flvStream.on('flv-packet-audio', (flvPacket: FlvPacketAudio) => {
        typedPacketsCount++;
      });

      flvStream.on('flv-packet-video', (flvPacket: FlvPacketVideo) => {
        typedPacketsCount++;
      });

      flvStream.on('flv-packet-metadata', (flvPacket: FlvPacketMetadata) => {
        typedPacketsCount++;
      });

      flvStream.on('flv-packet-unknown', (flvPacket: FlvPacket) => {
        typedPacketsCount++;
      });

      await new Promise((resolve) => {
        flvStream.on('close', resolve);

        fileReadStream.pipe(flvStream);
      });
    });

    it('should return the same number of packets on both apis', () => {
      assert.strictEqual(typedPacketsCount, parsedFlvPackets.length);
    });

    it('should produce exactly the same output file', () => {
      const initialFile = fs.readFileSync(filePath);

      const parsedFile = Buffer.from([
        ...parsedFlvHeader.build(),
        ...Buffer.concat(
          parsedFlvPackets.map((flvPacker) => flvPacker.build()),
        ),
      ]);

      assert.deepEqual(parsedFile, initialFile);
    });
  });
});
