import SimpleGNB from "./SimpleGNB";

function Layout(props) {
  return (
    <>
      <SimpleGNB />
      <main class="layout-main">{props.children}</main>
    </>
  );
}

export default Layout;
