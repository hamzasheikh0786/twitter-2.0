import Landing from "@/components/Landing";
import Mainlayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/components/context/AuthContext";
import { SubscriptionProvider } from "@/components/context/SubscriptionContext";
import { NotificationProvider } from "@/components/context/NotificationContext";
import { LanguageProvider } from "@/components/context/LanguageContext";
import LanguageVerificationModal from "@/components/LanguageVerificationModal";
import Image from "next/image";

export default function Home() {

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <NotificationProvider>
          <LanguageProvider>
            <Mainlayout>
              {" "}
              <Landing />
            </Mainlayout>
            <LanguageVerificationModal />
          </LanguageProvider>
        </NotificationProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}