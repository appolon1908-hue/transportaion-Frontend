import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./styles.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.config.errorHandler = (error, _instance, info) => {
  const errorType = error instanceof Error ? error.name : "UnknownError";
  console.error("Freight portal error", { errorType, info });
};
app.mount("#app");
