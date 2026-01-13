import React, { useState, useEffect } from "react";
import { Activity, Server, Users, TrendingUp, AlertCircle } from "lucide-react";
import { enhancementService } from "../services/api";

export default function SystemHealthDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        const data = await enhancementService.getSystemHealthMetrics();
        setMetrics(data);
      } catch (err) {
        setError("Failed to load system metrics");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">Loading system metrics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-red-500">{error || "Failed to load metrics"}</p>
      </div>
    );
  }

  // eslint-disable-next-line no-unused-vars
  const MetricCard = ({ icon: IconComponent, label, value, unit, color }) => (
    <div
      className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow p-6 border-l-4"
      style={{ borderColor: color }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {typeof value === "number" ? value.toLocaleString() : value}
            {unit && <span className="text-lg text-gray-500 ml-2">{unit}</span>}
          </p>
        </div>
        <IconComponent size={32} style={{ color }} className="opacity-20" />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Server size={24} className="text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          icon={Users}
          label="Total Users"
          value={metrics.totalUsers}
          color="#3B82F6"
        />

        <MetricCard
          icon={TrendingUp}
          label="Active Users (24h)"
          value={metrics.activeUsers}
          color="#10B981"
        />

        <MetricCard
          icon={Activity}
          label="Total Posts"
          value={metrics.totalPosts}
          color="#F59E0B"
        />

        <MetricCard
          icon={TrendingUp}
          label="Skills Tracked"
          value={metrics.totalSkills}
          color="#8B5CF6"
        />

        <MetricCard
          icon={Server}
          label="Scheduled Posts"
          value={metrics.scheduledPosts}
          color="#EC4899"
        />

        <MetricCard
          icon={Activity}
          label="Pending Requests"
          value={metrics.pendingRequests}
          color="#EF4444"
        />
      </div>

      <div className="px-6 pb-6 text-sm text-gray-500 text-right">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
}
