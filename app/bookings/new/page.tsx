import SubHeader from "@/components/SubHeader";
import BookingForm from "../BookingForm";

export default function NewBookingPage() {
  return (
    <>
      <SubHeader title="New Booking" subtitle="Add a stay manually" />
      <div className="px-6 py-6">
        <BookingForm />
      </div>
    </>
  );
}
