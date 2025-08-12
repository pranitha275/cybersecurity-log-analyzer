import { redirect } from 'next/navigation';

export default function HomePage() {
// Redirect to the login page as the entry point
redirect('/login');
}
