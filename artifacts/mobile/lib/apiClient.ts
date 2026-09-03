import * as SecureStore from "expo-secure-store";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const domain = (process.env.EXPO_PUBLIC_API_DOMAIN || "6c2221bd-c94a-4551-a181-36ee1b366c83-00-2nn64jxbrnxn0.archer.replit.dev");
if (domain) setBaseUrl(`https://${domain}`);

setAuthTokenGetter(() => SecureStore.getItemAsync("auth_session_token"));
