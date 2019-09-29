# node-flv

## Overview

The purpose of this package is to give you an ability to parse flv stream on the fly and get highly structured and strongly typed flv package data.

## API

```
const fileReadStream = fs.createReadStream('file.flv');
const flvStream = new FlvStreamParser();

flvStream.on('flv-header', (header: FlvHeader) => {
  // this will most certainly fire first
  // it's a header of the flv stream
});

flvStream.on('flv-packet', (flvPacket: FlvPacket) => {
  // this is an flv packet itself
});


fileReadStream.pipe(flvStream);
```
