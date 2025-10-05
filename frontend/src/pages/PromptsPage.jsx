import PromptList from "../components/PromptList";
import NotificationBell from "../components/NotificationBell";

const PromptsPage = () => {
  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Memory Prompts</h1>
        <NotificationBell />
      </header>
      <PromptList />
    </div>
  );
};

export default PromptsPage;
