import * as _ from 'lodash';
import * as bitwise from 'bitwise';

export enum SoundFormatEnum {
  'PCM_PE' = 0,
  'ADPCM' = 1,
  'MP3' = 2,
  'PCM_LE' = 3,
  'NELLYMOSER_16KHZ_MONO' = 4,
  'NELLYMOSER_8KHZ_MONO' = 5,
  'NELLYMOSER' = 6,
  'G.711_A-LAW_PCM' = 7,
  'G.711_MU-LAW_PCM' = 8,
  'RESERVED' = 9,
  'AAC' = 10,
  'SPEEX' = 11,
  'MP3_8KHZ' = 14,
  'DEVICE-SPECIFIC' = 15,
}

export enum SoundSampleRateEnum {
  '5.5KHZ' = 0,
  '11KHZ' = 1,
  '22KHZ' = 2,
  '44KHZ' = 3,
}

export enum SoundBitDepthEnum {
  '8BIT' = 0,
  '16BIT' = 1,
}

export enum SoundChannelsEnum {
  'MONO' = 0,
  'STEREO' = 1,
}

export enum VideoFrameTypeEnum {
  'KEYFRAME' = 1,
  'INTER_FRAME' = 2,
  'DISPOSABLE_FRAME' = 3,
  'GENERATED_KEYFRAME' = 4,
  'VIDEO_INFO' = 5,
}

export enum VideoCodecIdEnum {
  'JPEG' = 1,
  'SORENSON_H.263' = 2,
  'SCREEN_VIDEO' = 3,
  'ON2_VP6' = 4,
  'ON2_VP6_WA' = 5,
  'SCREEN_VIDEO_VERSION_2' = 6,
  'AVC' = 7,
}

export interface IAudioData {
  readonly format: SoundFormatEnum;
  readonly sampleRate: SoundSampleRateEnum;
  readonly bitDepth: SoundBitDepthEnum;
  readonly channels: SoundChannelsEnum;
}

export interface IVideoData {
  readonly frameType: VideoFrameTypeEnum;
  readonly codecId: VideoCodecIdEnum;
}

export interface IMetadataData {
  readonly [paramName: string]: number | string | boolean;
}

export function parseAudio(payload: Buffer): IAudioData {
  const formatBit: number = bitwise.readUInt(payload, 0, 4);
  const sampleRateBit: number = bitwise.readUInt(payload, 4, 2);
  const bitDepthBit: number = bitwise.readUInt(payload, 6, 1);
  const channelsBit: number = bitwise.readUInt(payload, 7, 1);

  const format = _.find(SoundFormatEnum, (value) => value === formatBit);
  const sampleRate = _.find(
    SoundSampleRateEnum,
    (value) => value === sampleRateBit,
  );
  const bitDepth = _.find(SoundBitDepthEnum, (value) => value === bitDepthBit);
  const channels = _.find(SoundChannelsEnum, (value) => value === channelsBit);

  if (!_.every([format, sampleRate, bitDepth, channels])) {
    throw new Error(`could_not_parse_audio`);
  }

  return {
    format,
    sampleRate,
    bitDepth,
    channels,
  };
}

export function parseVideo(payload: Buffer): IVideoData {
  const frameTypeBit: number = bitwise.readUInt(payload, 0, 4);
  const codecIdBit: number = bitwise.readUInt(payload, 4, 4);

  const frameType = _.find(
    VideoFrameTypeEnum,
    (value) => value === frameTypeBit,
  );
  const codecId = _.find(VideoCodecIdEnum, (value) => value === codecIdBit);

  if (!_.every([frameType, codecId])) {
    throw new Error(`could_not_parse_video`);
  }

  return {
    frameType,
    codecId,
  };
}

export function parseMetadata(payload: Buffer): IMetadataData {
  if (payload.readUInt8(0) !== 2) {
    throw new Error(`unknown_metadata_format`);
  }

  const stringLength = payload.readUIntBE(1, 2);

  let parseOffset = 3;

  const metadataName = payload.toString(
    'utf8',
    parseOffset,
    parseOffset + stringLength,
  );

  parseOffset += stringLength;

  const metadataObjType = payload.readUInt8(parseOffset);

  if (![3, 8].includes(metadataObjType)) {
    throw new Error(`unknown_metadata_type ${metadataObjType}`);
  }

  parseOffset++;

  switch (metadataObjType) {
    case 3: {
      parseOffset += 1;

      break;
    }
    case 8: {
      // number of items in metadata hash-map
      const metadataLength = payload.readUInt32BE(parseOffset);

      parseOffset += 5;

      break;
    }
  }

  const params: any = {};

  while (true) {
    if (parseOffset >= payload.length - 2) break;

    const paramNameLength = payload.readUInt8(parseOffset);

    parseOffset++;

    const paramName = payload.toString(
      'utf8',
      parseOffset,
      parseOffset + paramNameLength,
    );

    parseOffset += paramNameLength;

    const valueType = payload.readUInt8(parseOffset);

    parseOffset++;

    switch (valueType) {
      case 0: {
        params[paramName] = payload.readDoubleBE(parseOffset);

        parseOffset += 8;

        break;
      }
      case 1: {
        params[paramName] = Boolean(payload.readUIntBE(parseOffset, 1));

        parseOffset += 1;

        break;
      }
      case 2: {
        let valueLength = payload.readInt16BE(parseOffset);

        parseOffset += 2;

        params[paramName] = payload.toString(
          'utf8',
          parseOffset,
          parseOffset + valueLength,
        );

        parseOffset += valueLength;

        break;
      }
      default: {
        throw new Error(`unknown_metadata_value_type ${valueType}`);
      }
    }

    parseOffset++;
  }

  return params;
}
