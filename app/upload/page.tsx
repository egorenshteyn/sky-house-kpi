import SubHeader from "@/components/SubHeader";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <>
      <SubHeader
        title="Upload"
        subtitle="Drop a screenshot or document and create a booking from it"
      />
      <div className="px-6 py-6">
        <UploadForm />
      </div>
    </>
  );
}
