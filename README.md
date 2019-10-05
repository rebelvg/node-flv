# node-flv

https://www.npmjs.com/package/node-flv

## Overview

The purpose of this package is to give you an ability to parse flv stream on the fly and get highly structured and strongly typed flv package data.
Still heavy WIP.

## API

```ts
const fileReadStream = fs.createReadStream('file.flv');

const flvStream = new FlvStreamParser();

flvStream.on('flv-header', (flvHeader: FlvHeader) => {
  // this will most certainly fire first
  // it's a header of the flv stream

  flvHeader.buildHeader();
});

flvStream.on('flv-packet', (flvPacket: FlvPacket) => {
  // this is an flv packet itself
  // packets can be of three types: audio, video, metadata
  // any property of the packet that is not read only can be changed and the will be reflected in the result of the build packet function

  flvPacket.buildPacket();
});

// separate events for each packet type for your convenience

flvStream.on('flv-packet-audio', (flvPacket: FlvPacketAudio) => {});

flvStream.on('flv-packet-video', (flvPacket: FlvPacketVideo) => {});

flvStream.on('flv-packet-metadata', (flvPacket: FlvPacketMetadata) => {});

flvStream.on('flv-packet-unknown', (flvPacket: FlvPacket) => {});

fileReadStream.pipe(flvStream);
```

## Planned Features

- Modify audio, video, metadata and get that reflected in the packet built
