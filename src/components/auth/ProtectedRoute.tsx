import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import Spin from "../ui/spin";

const ProtectedRoute = () => {
  const { accessToken, user, loading, refresh, fetchMe } = useAuthStore();
  const [starting, setStarting] = useState(true);

  const init = async () => {
    // Lấy lại accessToken và user mới nhất từ store (tránh closure)
    const currentAccessToken = useAuthStore.getState().accessToken;
    const currentUser = useAuthStore.getState().user;

    // có thể xảy ra khi refresh trang
    if (!currentAccessToken) {
      await refresh();
    }

    const nextAccessToken = useAuthStore.getState().accessToken;
    const nextUser = useAuthStore.getState().user;

    if (nextAccessToken && !nextUser) {
      await fetchMe();
    }

    setStarting(false);
  };

  useEffect(() => {
    init();
  }, []);

  if (starting || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin title="Đang tải trang..." />
      </div>
    );
  }

  if (!accessToken) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet></Outlet>;
};

export default ProtectedRoute;
