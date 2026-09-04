import * as SecureStore from "expo-secure-store";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const domain = (process.env.EXPO_PUBLIC_API_DOMAIN || "");
if (domain) setBaseUrl(`https://${domain}`);

setAuthTokenGetter(() => SecureStore.getItemAsync("auth_session_token"));
