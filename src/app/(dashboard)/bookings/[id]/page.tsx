type Props = {
  params: Promise<{ id: string }>;
};

async function BookingDetails({ params }: Props) {
  const { id } = await params;

  return <div> Details for booking #{id}</div>;
}

export default BookingDetails;
