import { ModeToggle } from "./mode-toggle";

export function Header() {
  return (
    <header className="flex items-center p-4 justify-between border border-b">
      <h1 className="text-2xl font-bold">Audio</h1>

      <ModeToggle />
    </header>
  );
}
