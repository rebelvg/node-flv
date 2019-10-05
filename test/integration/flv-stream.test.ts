import * as fs from 'fs';
import * as path from 'path';
import { assert } from 'chai';

import { FlvStreamParser, FlvHeader, FlvPacket, FlvPacketAudio, FlvPacketVideo, FlvPacketMetadata } from '../../src';

describe('FlvStreamParser integration test', () => {
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

    fileReadStream.pipe(flvStream);

    await new Promise(resolve => {
      fileReadStream.on('close', () => {
        resolve();
      });
    });
  });

  it('should return the same number of packets on both apis', () => {
    assert.strictEqual(typedPacketsCount, parsedFlvPackets.length);
  });

  it('should produce exactly the same output file', () => {
    const initialFile = fs.readFileSync(filePath);

    // since we're trying to compare this to a file, we have to fake footer ourselves
    // flv doesn't have footer per se, it's just 4 bytes that indicate payload length of the previous packet
    const fileFooter = Buffer.alloc(4);
    fileFooter.writeUInt32BE(11 + parsedFlvPackets[parsedFlvPackets.length - 1].payload.length, 0);

    const parsedFile = Buffer.from([
      ...parsedFlvHeader.buildHeader(),
      ...Buffer.concat(parsedFlvPackets.map(flvPacker => flvPacker.buildPacket())),
      ...fileFooter
    ]);

    assert.deepEqual(parsedFile, initialFile);
  });
});
