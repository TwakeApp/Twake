import PreviewService from ".";
import { server } from "./webserver/index";

const start = async () => {
  await new PreviewService().init(server);
  try {
    await server.listen(3000);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
