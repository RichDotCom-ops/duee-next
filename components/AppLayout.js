'use client';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AiChat from './AiChat';
import StudyTimer from './StudyTimer';

export default function AppLayout({ title, children, user }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar title={title} user={user} />
        <div className="page-content">{children}</div>
      </div>
      <AiChat />
      <StudyTimer />
    </div>
  );
}
