import SettingsPanel from "../../../components/admin/SettingsPanel";
import { getAdminEmails } from "../../../lib/admin";

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <SettingsPanel adminEmails={getAdminEmails()} />
    </div>
  );
}
