import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer
} from "recharts";

function ECGChart({ isAlert }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        // ⚡ More aggressive spikes if alert
        const base = Math.sin(Date.now() / 200) * 40;
        const spike = isAlert ? (Math.random() * 80 - 40) : (Math.random() * 10);

        const newPoint = {
          value: base + spike
        };

        const updated = [...prev, newPoint];
        return updated.slice(-25);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isAlert]);

  return (
    <div className="ecg-mini">
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={isAlert ? "#ff4d4d" : "#00ffcc"}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ECGChart;