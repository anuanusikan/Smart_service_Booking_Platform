const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

async function declinePendingBookings(filter, sender, jobTitle, session) {
  const options = session ? { session } : {};
  const pending = await Booking.find({ ...filter, status: 'pending' }, null, options);
  for (const booking of pending) {
    const declined = await Booking.findOneAndUpdate(
      { _id: booking._id, status: 'pending' }, { status: 'declined' }, { new: true, ...options }
    );
    if (!declined) continue;
    const notification = {
      recipient: declined.provider, sender, type: 'booking_status', title: 'Booking Request Declined',
      message: `Your request for "${jobTitle || 'the job'}" was declined because another provider was selected.`,
      link: '/my-bookings'
    };
    if (session) {
      // Notification failures must abort quote acceptance with its other writes.
      await Notification.create([notification], options);
    } else {
      try { await Notification.create(notification); }
      catch (err) { console.error('Booking notification error:', err); }
    }
  }
}

module.exports = { declinePendingBookings };
