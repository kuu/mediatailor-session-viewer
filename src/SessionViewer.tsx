import { useCallback, useEffect } from 'react';
import './App.css'
import { useLogs } from './LogProvider'

function SessionViewer({logs}) {
  const [{ getLog, increment, decrement, getRows }] = useLogs(logs);
  const {originManifest, generatedManifest, timestamp} = getLog();

  // handle what happens on key press
  const handleKeyPress = useCallback(({key}) => {
    if (key === 'p' || key === 'P' || key === 'ArrowUp' || key === 'ArrowLeft') {
      decrement();
    } else if (key === 'n' || key === 'N' || key === 'ArrowDown' || key === 'ArrowRight') {
      increment();
    }
    console.log(`Key pressed: "${key}"`);
  }, []);

  useEffect(() => {
    // attach the event listener
    document.addEventListener('keydown', handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div className="card">
        <div style={{height: `${getRows() * 1.5}em`}}>
            <p>Generated Time: {timestamp.toISOString()}</p>
            <div className="manifest">
                <p>ORIGIN_MANIFEST</p>
                <p className="m3u8" dangerouslySetInnerHTML={{__html: `<p>${originManifest.replace(/\n/g, '<br/>')}</p>`}}></p>
            </div>
            <div className="manifest">
                <p>GENERATED_MANIFEST</p>
                <p className="m3u8" dangerouslySetInnerHTML={{__html: `<p>${generatedManifest.replace(/\n/g, '<br/>')}</p>`}}></p>
            </div>
        </div>
        <div>
            <button onClick={() => decrement()}>
              Prev
            </button>
            <button onClick={() => increment()}>
              Next
            </button>
            <p>
            Press [P] or [N] for moving backward/forward
            </p>
        </div>
    </div>
  )
}

export default SessionViewer
