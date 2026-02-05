import { render } from "solid-js/web";
import { Router } from "@solidjs/router";
import { routes } from "./routes";
import App from "./App";

const root = document.getElementById("root");

render(() => <Router root={App}>{routes}</Router>, root!);
