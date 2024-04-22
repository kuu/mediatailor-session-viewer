import { createContext, useState, useContext } from 'react';
import { parse, types, stringify } from 'hls-parser';

interface CWLog {
  readonly '@timestamp': string;
  readonly eventType: string;
  readonly responseBody: string;
}

interface Log {
  originManifest: string;
  originManifestObj?: types.Playlist;
  generatedManifest: string;
  generatedManifestObj?: types.Playlist;
  timestamp: Date;
}

interface MethodSet {
  getLog: (p?: number) => Log;
  increment: () => void;
  decrement: () => void;
  getLength: () => number;
  getCurrentPos: () => number;
  getRows: () => number;

}

const defaultValue = {
  getLog: () => ({
    originManifest: '',
    generatedManifest: '',
    timestamp: new Date(),
  }),
  increment: () => null,
  decrement: () => null,
  getLength: () => 0,
  getCurrentPos: () => 0,
  getRows: () => 0,
};

type MethodSetContext = [MethodSet];
const LogContext =  createContext<MethodSetContext>([defaultValue]);
let logs: Log[]
let maxRows = 0;

export const useLogs = (logJson) => {
  [logs, maxRows] = formatLogs(logJson);
  return useContext(LogContext);
}

export default function LogProvider({ children }) {
  const [pos, setPos] = useState(0);
  
  const getLog = (p = -1) => {
    if (p >= 0 && p < logs.length) {
      setPos(p);
      return logs[p];
    }
    return logs[pos];
  }

  const increment = () => {
    setPos(pos => pos < logs.length - 1 ? pos + 1 : pos);
  }

  const decrement = () => {
    setPos(pos => pos > 0 ? pos - 1 : pos);
  }

  const getLength = () => logs.length;

  const getCurrentPos = () => pos;

  const getRows = () => maxRows;

  const value: MethodSetContext = [
    {
      getLog,
      increment,
      decrement,
      getLength,
      getCurrentPos,
      getRows
    },
  ];

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
}

function formatLogs(logs: CWLog[]): [Log[], number] {
  const sortedLogs = sortLogs(logs);
  const formattedLogs: Log[] = [];
  let curr: Log = {
    originManifest: '',
    generatedManifest: '',
    timestamp: new Date(),
  };
  let maxRows = 0;
  for (const log of sortedLogs) {
    if (log.eventType === 'ORIGIN_MANIFEST') {
      curr.originManifest = log.responseBody;
      curr.timestamp = new Date(log['@timestamp']);
    } else if (log.eventType === 'GENERATED_MANIFEST') {
      curr.generatedManifest = log.responseBody;
      curr.timestamp = new Date(log['@timestamp']);
    } else {
      continue;
    }
    maxRows = Math.max(log.responseBody.split('\n').length, maxRows);
    if (curr.originManifest && curr.generatedManifest) {
      if (formattedLogs.length > 1) {
        curr = highlightChangedPart(formattedLogs[formattedLogs.length - 1], curr);
      }
      formattedLogs.push(curr);
      curr = {
        originManifest: '',
        generatedManifest: '',
        timestamp: new Date(),
      };
    }
  }
  return [formattedLogs, maxRows];
}

function sortLogs(logs: CWLog[]): CWLog[] {
  return logs.sort((a, b) => {
    const timestampDiff = new Date(a['@timestamp']).getTime() - new Date(b['@timestamp']).getTime();
    if (timestampDiff !== 0) {
      return timestampDiff;
    }
    return a.eventType === 'ORIGIN_MANIFEST' ? -1 : 1;
  });
}

function highlightChangedPart(prev: Log, curr: Log): Log {
  const [prevOriginManifestObj, prevGeneratedManifestObj] = useCache(prev);
  const [currOriginManifestObj, currGeneratedManifestObj] = useCache(curr);
  curr.originManifest = highlightDiff(prevOriginManifestObj, currOriginManifestObj);
  curr.generatedManifest = highlightDiff(prevGeneratedManifestObj, currGeneratedManifestObj);
  return curr;
}

function useCache(log: Log): types.Playlist[] {
  const originManifestObj = log.originManifestObj ?? parse(log.originManifest);
  log.originManifestObj = originManifestObj;
  const generatedManifestObj = log.generatedManifestObj ?? parse(log.generatedManifest);
  log.generatedManifestObj = generatedManifestObj;
  return [originManifestObj, generatedManifestObj];
}

function highlightDiff(prevPlaylist: types.Playlist, currPlaylist: types.Playlist): string {
  if (prevPlaylist.isMasterPlaylist || currPlaylist.isMasterPlaylist) {
    return stringify(currPlaylist as types.MasterPlaylist);
  }
  const prev = prevPlaylist as types.MediaPlaylist;
  const curr = currPlaylist as types.MediaPlaylist;

  const {segments: prevSegments} = prev as types.MediaPlaylist;
  const {segments: currSegments} = curr as types.MediaPlaylist;

  const diff = currSegments[currSegments.length - 1].mediaSequenceNumber - prevSegments[prevSegments.length - 1].mediaSequenceNumber;
  const segmentProcessor = (lines: string[], start: number, end: number, _: types.Segment, i: number) => {
    if (i === currSegments.length - diff) {
      lines[start] = `<b>${lines[start]}`;
    }
    if (i === currSegments.length - 1) {
      lines[end] = `${lines[end]}</b>`;
    }
  };
  let txt = stringify(curr as types.MediaPlaylist, {segmentProcessor});
  if (prev.mediaSequenceBase !== curr.mediaSequenceBase) {
    txt = txt.replace(/(#EXT-X-MEDIA-SEQUENCE:).*/, `$1<b>${curr.mediaSequenceBase}</b>`);
  }
  if (prev.discontinuitySequenceBase !== curr.discontinuitySequenceBase) {
    txt = txt.replace(/(#EXT-X-DISCONTINUITY-SEQUENCE:).*/, `$1<b>${curr.discontinuitySequenceBase}</b>`);
  }
  return txt;
}
