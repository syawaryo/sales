import { ArrowUp, ArrowDown } from "react-feather";
import { useState } from "react";

function Event({ event, timestamp }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isClient = event.event_id && !event.event_id.startsWith("event_");

  return (
    <div className="flex flex-col gap-1 p-1 rounded bg-gray-50">
      <div
        className="flex items-center gap-1 cursor-pointer text-xs"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isClient ? (
          <ArrowDown className="text-blue-400 w-3 h-3" />
        ) : (
          <ArrowUp className="text-green-400 w-3 h-3" />
        )}
        <div className="text-gray-600 truncate">
          {isClient ? "↓" : "↑"}
          &nbsp;{event.type}
        </div>
      </div>
      <div
        className={`text-gray-500 bg-gray-200 p-1 rounded text-xs overflow-x-auto ${
          isExpanded ? "block" : "hidden"
        }`}
      >
        <pre style={{ fontSize: "10px" }}>{JSON.stringify(event, null, 2)}</pre>
      </div>
    </div>
  );
}

export default function EventLog({ events }) {
  const eventsToDisplay = [];
  let deltaEvents = {};

  events.forEach((event) => {
    if (event.type.endsWith("delta")) {
      if (deltaEvents[event.type]) {
        // for now just log a single event per render pass
        return;
      } else {
        deltaEvents[event.type] = event;
      }
    }

    eventsToDisplay.push(
      <Event key={event.event_id} event={event} timestamp={event.timestamp} />,
    );
  });

  return (
    <div className="flex flex-col gap-1">
      {events.length === 0 ? (
        <div className="text-gray-500 text-xs">Awaiting events...</div>
      ) : (
        eventsToDisplay
      )}
    </div>
  );
}
