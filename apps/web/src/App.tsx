import { Layout } from "./components/Layout";
import { CreatePage } from "./pages/CreatePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ReceivePage } from "./pages/ReceivePage";

export function App() {
	const path = window.location.pathname;
	const receive = path.match(/^\/d\/([A-Za-z0-9_-]+)$/);

	let page = <NotFoundPage />;
	if (path === "/") page = <CreatePage />;
	else if (receive) page = <ReceivePage id={receive[1]} />;

	return <Layout>{page}</Layout>;
}
