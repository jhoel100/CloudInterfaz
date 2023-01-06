import { StrictMode } from "react";
import ReactDOM from "react-dom";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import init, { set_panic_hook } from "rustpad-wasm";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

init().then(() => {
  set_panic_hook();
  ReactDOM.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider>
          <App />
        </ChakraProvider>
      </QueryClientProvider>
    </StrictMode>,
    document.getElementById("root")
  );
});
