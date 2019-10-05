import * as _ from 'lodash';
import * as bitwise from 'bitwise';

const DATA_TYPES = {
  audio: {
    soundFormat: {
      2: 'mp3',
      10: 'aac'
    },
    soundRate: {
      3: 44.1
    },
    soundSize: {
      1: 16
    },
    soundType: {
      0: 1,
      1: 2
    }
  },
  video: {
    frameType: {
      1: 'key-frame',
      2: 'inter-frame'
    },
    codecId: {
      4: 'on2 vp6',
      7: 'avc'
    }
  }
};

export interface IAudioData {
  readonly soundFormat: string;
  readonly soundRate: number;
  readonly soundSize: number;
  readonly channels: number;
}

export interface IVideoData {
  readonly frameType: string;
  readonly codecId: string;
}

export interface IMetadataData {
  readonly [paramName: string]: number | string | boolean;
}

export function parseAudio(payload: Buffer): IAudioData {
  const soundFormatBit: number = bitwise.readUInt(payload, 0, 4);
  const soundRateBit: number = bitwise.readUInt(payload, 4, 2);
  const soundSizeBit: number = bitwise.readUInt(payload, 6, 1);
  const soundTypeBit: number = bitwise.readUInt(payload, 7, 1);

  const soundFormat = _.get(DATA_TYPES, ['audio', 'soundFormat', soundFormatBit]);
  const soundRate = _.get(DATA_TYPES, ['audio', 'soundRate', soundRateBit]);
  const soundSize = _.get(DATA_TYPES, ['audio', 'soundSize', soundSizeBit]);
  const channels = _.get(DATA_TYPES, ['audio', 'soundType', soundTypeBit]);

  if (!soundFormat) throw new Error(`Unknown sound format ${soundFormatBit}`);
  if (!soundRate) throw new Error(`Unknown sound rate ${soundRateBit}`);
  if (!soundSize) throw new Error(`Unknown sound size ${soundSizeBit}`);
  if (!channels) throw new Error(`Unknown sound type ${soundTypeBit}`);

  return {
    soundFormat,
    soundRate,
    soundSize,
    channels
  };
}

export function parseVideo(payload: Buffer): IVideoData {
  const frameTypeBit: number = bitwise.readUInt(payload, 0, 4);
  const codecIdBit: number = bitwise.readUInt(payload, 4, 4);

  const frameType = _.get(DATA_TYPES, ['video', 'frameType', frameTypeBit]);
  const codecId = _.get(DATA_TYPES, ['video', 'codecId', codecIdBit]);

  if (!frameType) throw new Error(`Unknown frame type ${frameTypeBit}`);
  if (!codecId) throw new Error(`Unknown codec id ${codecIdBit}`);

  return {
    frameType,
    codecId
  };
}

export function parseMetadata(payload: Buffer): IMetadataData {
  if (payload.readUInt8(0) !== 2) throw new Error(`Unknown metadata format`);

  const stringLength = payload.readUIntBE(1, 2);

  let parseOffset = 3;

  const metadataName = payload.toString('utf8', parseOffset, parseOffset + stringLength);

  parseOffset += stringLength;

  const metadataObjType = payload.readUInt8(parseOffset);

  if (![3, 8].includes(metadataObjType)) throw new Error(`Unknown metadata type ${metadataObjType}`);

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

    const paramName = payload.toString('utf8', parseOffset, parseOffset + paramNameLength);

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

        params[paramName] = payload.toString('utf8', parseOffset, parseOffset + valueLength);

        parseOffset += valueLength;

        break;
      }
      default: {
        throw new Error(`Unknown metadata value type ${valueType}`);
      }
    }

    parseOffset++;
  }

  return params;
}

export function buildAudio(audioData: IAudioData): Buffer {
  return Buffer.from([]);
}
