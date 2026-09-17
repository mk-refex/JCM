import { BrowserRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { AppRoutes } from "@/router";
import i18n from "@/i18n";
import { AppProvider } from "@/store/AppContext";
import { ToastProvider } from "@/store/ToastContext";
import ToastHost from "@/components/base/ToastHost";
import ScrollToTop from "@/components/base/ScrollToTop";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AppProvider>
        <ToastProvider>
          <BrowserRouter basename={__BASE_PATH__}>
            <ScrollToTop />
            <AppRoutes />
          </BrowserRouter>
          <ToastHost />
        </ToastProvider>
      </AppProvider>
    </I18nextProvider>
  );
}

export default App;