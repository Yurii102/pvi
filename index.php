<?php
// Start session at the very beginning - ONLY ONCE
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Determine the page from GET parameter, default to 'student'
$page = $_GET['page'] ?? 'student';
$view_to_render = null; // Variable to hold which view file to include later

// Process actions that might redirect (login, logout) BEFORE any HTML output
switch ($page) {
    case 'login':
        // Handle login POST request
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            require_once 'models/User.php'; // Ensure User model is included

            $username = $_POST['username'] ?? null;
            $password = $_POST['password'] ?? null;

            if ($username && $password) {
                $user = User::login($username, $password);

                if ($user) {
                    // Login successful
                    $_SESSION['loggedin'] = true;
                    $_SESSION['username'] = $user['name'];
                    unset($_SESSION['login_error']); // Clear any previous error
                    header('Location: index.php?page=student'); // Redirect
                    exit; // Stop script execution
                } else {
                    // Login failed
                    header('Location: index.php?page=student&login_error=1'); // Redirect with error flag
                    exit; // Stop script execution
                }
            } else {
                 // Username or password missing
                 header('Location: index.php?page=student&login_error=1'); // Redirect with error flag
                 exit; // Stop script execution
            }
        } else {
             // If login accessed via GET, redirect to student page
             header('Location: index.php?page=student');
             exit; // Stop script execution
        }
        // No break needed after exit
     case 'logout':
        // Handle logout logic
        session_unset(); // Remove all session variables
        session_destroy(); // Destroy the session
        header('Location: index.php?page=student'); // Redirect to student page after logout
        exit; // Stop script execution
        // No break needed after exit
}

// If we haven't exited due to a redirect, include the header
require_once 'views/layouts/header.php';

// Now determine which view to render based on the page
switch ($page) {
    case 'dashboard':
        $view_to_render = 'views/dashboard.php';
        break;
    case 'student':
        $view_to_render = 'views/student.php';
        break;
    case 'tasks':
        $view_to_render = 'views/tasks.php';
        break;
    case 'messages':
        $view_to_render = 'views/messages.php';
        break;
    // Login and Logout cases are handled above and exit
    default:
        $view_to_render = 'views/student.php'; // Default fallback page
        break;
}

// Include the determined view file if set
if ($view_to_render) {
    require_once $view_to_render;
}

// Optionally include a footer here
// require_once 'views/layouts/footer.php';

?>