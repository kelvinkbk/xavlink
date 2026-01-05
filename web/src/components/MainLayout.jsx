import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function MainLayout({ children }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex">
      {isAuthenticated && <Sidebar />}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
