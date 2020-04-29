# node-flv

https://www.npmjs.com/package/node-flv

## Overview

The purpose of this package is to give you an ability to parse FLV stream on the fly and get highly structured and strongly typed FLV container data that can be modified and built back into a buffer. Covered with tests.

## API

```ts
const fileReadStream = fs.createReadStream('file.flv');

const flvStream = new FlvStreamParser();

flvStream.on('flv-header', (flvHeader: FlvHeader) => {
  // this will most certainly fire first
  // it's a header of the flv stream

  flvHeader.build();
});

flvStream.on('flv-packet', (flvPacket: FlvPacket) => {
  // this is an flv packet itself
  // packets can be of three types: audio, video, metadata
  // any property of the packet that is not read only can be changed and that will be reflected in the result of the build packet function

  flvPacket.build();
});

// separate events for each packet type for your convenience

flvStream.on('flv-packet-audio', (flvPacket: FlvPacketAudio) => {});

flvStream.on('flv-packet-video', (flvPacket: FlvPacketVideo) => {});

flvStream.on('flv-packet-metadata', (flvPacket: FlvPacketMetadata) => {});

flvStream.on('flv-packet-unknown', (flvPacket: FlvPacket) => {});

fileReadStream.pipe(flvStream);
```

## FLV Structure and Flow

FLV is a very structured datatype. It's a container that can hold various video and audio codecs. As an example, it can contain `vp6`, `avc` video codecs and `mp3`, `aac` audio codecs.

### Flow

FLV stream starts with an flv header followed by separate flv packets. Most of the time first flv packet is a metadata packet that contains information about the stream. It's payload is a hash-map of data.

```ts
Metadata Example

{ duration: 10.067,
  width: 1280,
  height: 720,
  videodatarate: 1000,
  framerate: 30,
  videocodecid: 7,
  audiodatarate: 125,
  audiosamplerate: 48000,
  audiosamplesize: 16,
  stereo: true,
  audiocodecid: 10,
  date: '2019-10-05T16:11:08+03:00',
  encoder: 'Lavf57.83.100',
  filesize: 496576 }
```

Usually followed by a first video and audio packet. These first video and audio packets are important. They should have `timestampLower` of 0, clients (video-players, codec decoders) use these packets in order to initialize the whole stream. So, for example, for video packets these must be key-frame packets, otherwise players wont be able to initialize the render properly. Rest of the sequence after these first packets can vary dramatically. What is expected, of course, is that these next packets have correct values for both timestamp values `timestampLower` and `timestampUpper`.

### Structure

#### FlvHeader

```ts
{ signature: 'FLV',
  version: 1,
  flags: 5,
  headerSize: 9 }
```

`headerSize - byte length of the header, usually 9, reserved for backwards compatibility once the version changes`

#### FlvPacket

Contains flv packet header and a payload.

```ts
{ header: FlvPacketHeader,
  payload: Buffer }
```

#### FlvPacketHeader

```ts
{ packetTypeId: 18,
  payloadSize: 327,
  timestampLower: 0,
  timestampUpper: 0,
  streamId: 0 }
```

`packetTypeId - audio, video, metadata, etc`

`payloadSize - payload length of the current packet in bytes`

`timestampLower - timestamp relative to the first packet in milliseconds`

`timestampUpper - timestamp extension in milliseconds`

`streamId - always 0`

#### Official FLV specification guide

- https://www.adobe.com/content/dam/acom/en/devnet/flv/video_file_format_spec_v10.pdf

## Usage Examples

- https://github.com/rebelvg/flv-server

- https://github.com/rebelvg/flv-parser-ffmpeg-streamer
