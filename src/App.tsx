import { useState } from 'react';
import { FileUploader } from "react-drag-drop-files";
import SessionViewer from './SessionViewer'
import './App.css'
import reactLogo from './assets/react.svg'

function App() {
  const [json, setJson] = useState(null);
  const handleChange = (file) => {
    console.log(`${file.name} dropped!`);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      try {
        setJson(JSON.parse(text as string));
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsText(file);
  };
  return (
    <>
      <div>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>MediaTailor Session Viewer</h1>
      {json ?
        <SessionViewer logs={json} />
        :
        <div>
          <FileUploader handleChange={handleChange} name="file" types={["JSON"]} />
          <p>Export a JSON file from CloudWatch Logs Insights</p>
          <textarea readOnly={true} rows={8} cols={80} value={`
            Log group: MediaTailor/ManifestService
            Query:
            fields @timestamp, eventType, responseBody
            | filter sessionId = 'xxxx-xxxx-xxxx'
            | sort @timestamp asc
          `} />
        </div>
      }
    </>
  )
}

export default App
