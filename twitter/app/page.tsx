import Landing from "@/components/Landing";
import Mainlayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/components/context/AuthContext";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import Image from "next/image";

export default function Home() {

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <Mainlayout>
          {" "}
          <Landing />
        </Mainlayout>
      </SubscriptionProvider>
    </AuthProvider>
  );
}