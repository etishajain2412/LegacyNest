import { useEffect, useState } from "react";
import socket from "../utils/socket";

const NotificationBell = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    socket.on("prompt:new", () => {
      setCount((c) => c + 1);
    });

    return () => {
      socket.off("prompt:new");
    };
  }, []);

  return (
    <button className="relative p-2 border-2  border-black rounded">
      Notification 🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full px-2 text-xs">
          {count}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
