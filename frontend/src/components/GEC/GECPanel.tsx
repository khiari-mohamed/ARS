import React from 'react';
import MailComposer from './MailComposer';
import MailHistory from './MailHistory';
import OverdueRelances from './OverdueRelances';
import NotificationScheduler from './NotificationScheduler';
import MailTemplateEditor from './MailTemplateEditor';
import GECAnalytics from './GECAnalytics';
import NotificationConfig from './NotificationConfig';
import NotificationSchedulerDemo from './NotificationSchedulerDemo';

const GECPanel: React.FC = () => {
  return (
    <div>
      <h1>Gestion Électronique du Courrier (GEC)</h1>
      <MailComposer />
      <hr />
      <MailHistory />
      <OverdueRelances />
      <hr />
      <NotificationScheduler />
      <NotificationSchedulerDemo />
      <NotificationConfig />
      <hr />
      <MailTemplateEditor />
      <hr />
      <GECAnalytics />
    </div>
  );
};

export default GECPanel;