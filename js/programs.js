/**
 * The single source of truth for the assignment catalogue.
 *
 * Later modules should consume this data instead of maintaining their own
 * titles, questions, source code, or input definitions. The code strings are
 * intentionally small teaching examples; they cover only the syntax needed
 * by this assignment set.
 */

const PROGRAMS = [
  {
    id: 1,
    slug: 'call-by-value-online-shopping-discount',
    title: 'Call by Value – Online Shopping Discount',
    topic: 'Call by Value',
    question: 'Create a function that receives an order total by value, applies a discount locally, and proves that the original total remains unchanged.',
    code: String.raw`<?php
function applyDiscount($amount) {
    $amount = $amount - ($amount * 0.10);
    return $amount;
}

$orderTotal = 2500;
$discountedTotal = applyDiscount($orderTotal);
echo "Original total: Rs. " . $orderTotal . "\n";
echo "Discounted total: Rs. " . $discountedTotal;
?>`,
    inputs: [],
    features: ['function', 'parameter', 'return', 'call-by-value'],
    demoOutput: "Original total: Rs. 2500\nDiscounted total: Rs. 2250"
  },
  {
    id: 2,
    slug: 'call-by-reference-bank-account-balance',
    title: 'Call by Reference – Bank Account Balance',
    topic: 'Call by Reference',
    question: 'Create a function that deposits money into a bank balance by reference and displays the changed balance.',
    code: String.raw`<?php
function deposit(&$balance, $amount) {
    $balance = $balance + $amount;
}

$balance = 10000;
deposit($balance, 2500);
echo "Updated bank balance: Rs. " . $balance;
?>`,
    inputs: [],
    features: ['function', 'reference-parameter', 'mutation'],
    demoOutput: "Updated bank balance: Rs. 12500"
  },
  {
    id: 3,
    slug: 'variables-data-types-product-details',
    title: 'Variables & Data Types – Product Details',
    topic: 'Variables and Data Types',
    question: 'Declare product details using string, integer, float, and boolean variables, then display their values and types.',
    code: String.raw`<?php
$productName = "Wireless Keyboard";
$quantity = 2;
$price = 1499.50;
$inStock = true;

echo "Product: " . $productName . "\n";
echo "Quantity: " . $quantity . "\n";
echo "Price: Rs. " . $price . "\n";
echo "Available: " . ($inStock ? "Yes" : "No");
?>`,
    inputs: [],
    features: ['variables', 'string', 'integer', 'float', 'boolean'],
    demoOutput: "Product: Wireless Keyboard\nQuantity: 2\nPrice: Rs. 1499.5\nAvailable: Yes"
  },
  {
    id: 4,
    slug: 'operators-employee-salary-calculator',
    title: 'Operators – Employee Salary Calculator',
    topic: 'Operators',
    question: 'Calculate an employee’s gross salary using arithmetic, assignment, and comparison operators.',
    code: String.raw`<?php
$basicSalary = 30000;
$allowance = $basicSalary * 0.20;
$deduction = $basicSalary * 0.05;
$grossSalary = $basicSalary + $allowance - $deduction;

echo "Gross salary: Rs. " . $grossSalary . "\n";
echo "Salary above Rs. 25000: " . ($grossSalary > 25000 ? "Yes" : "No");
?>`,
    inputs: [],
    features: ['arithmetic-operators', 'assignment-operators', 'comparison-operators'],
    demoOutput: "Gross salary: Rs. 34500\nSalary above Rs. 25000: Yes"
  },
  {
    id: 5,
    slug: 'conditional-statements-movie-ticket-price',
    title: 'Conditional Statements – Movie Ticket Price',
    topic: 'Conditional Statements',
    question: 'Use conditional statements to calculate a movie ticket price based on the customer’s age.',
    code: String.raw`<?php
$age = 16;

if ($age < 5) {
    $price = 0;
} elseif ($age < 18) {
    $price = 150;
} else {
    $price = 250;
}

echo "Age: " . $age . "\n";
echo "Ticket price: Rs. " . $price;
?>`,
    inputs: [{ name: 'age', label: 'Age', type: 'number', value: 16, min: 0, max: 120 }],
    features: ['if', 'elseif', 'else', 'comparison'],
    demoOutput: "Age: 16\nTicket price: Rs. 150"
  },
  {
    id: 6,
    slug: 'switch-statement-mobile-recharge-plan',
    title: 'Switch Statement – Mobile Recharge Plan',
    topic: 'Switch Statement',
    question: 'Use a switch statement to display the price and benefits of a selected mobile recharge plan.',
    code: String.raw`<?php
$plan = "pro";

switch ($plan) {
    case "basic":
        $details = "Rs. 199 - 1 GB/day";
        break;
    case "pro":
        $details = "Rs. 399 - 2 GB/day";
        break;
    case "unlimited":
        $details = "Rs. 599 - Unlimited data";
        break;
    default:
        $details = "Plan not found";
}

echo "Selected plan: " . $plan . "\n";
echo "Details: " . $details;
?>`,
    inputs: [{ name: 'plan', label: 'Plan', type: 'select', value: 'pro', options: ['basic', 'pro', 'unlimited'] }],
    features: ['switch', 'case', 'break', 'default'],
    demoOutput: "Selected plan: pro\nDetails: Rs. 399 - 2 GB/day"
  },
  {
    id: 7,
    slug: 'for-loop-electricity-consumption-report',
    title: 'For Loop – Electricity Consumption Report',
    topic: 'For Loop',
    question: 'Use a for loop to display monthly electricity consumption and calculate the total.',
    code: String.raw`<?php
$units = [120, 145, 132, 160];
$total = 0;

for ($month = 0; $month < count($units); $month++) {
    echo "Month " . ($month + 1) . ": " . $units[$month] . " units\n";
    $total = $total + $units[$month];
}

echo "Total consumption: " . $total . " units";
?>`,
    inputs: [],
    features: ['for-loop', 'indexed-array', 'count'],
    demoOutput: "Month 1: 120 units\nMonth 2: 145 units\nMonth 3: 132 units\nMonth 4: 160 units\nTotal consumption: 557 units"
  },
  {
    id: 8,
    slug: 'while-loop-atm-transaction-system',
    title: 'While Loop – ATM Transaction System',
    topic: 'While Loop',
    question: 'Use a while loop to process a sequence of ATM withdrawals while sufficient balance remains.',
    code: String.raw`<?php
$balance = 5000;
$withdrawals = [1000, 1500, 500];
$index = 0;

while ($index < count($withdrawals)) {
    $amount = $withdrawals[$index];
    if ($amount <= $balance) {
        $balance = $balance - $amount;
        echo "Withdrawal approved: Rs. " . $amount . "\n";
    } else {
        echo "Withdrawal declined: Rs. " . $amount . "\n";
    }
    $index++;
}

echo "Remaining balance: Rs. " . $balance;
?>`,
    inputs: [],
    features: ['while-loop', 'indexed-array', 'if', 'increment'],
    demoOutput: "Withdrawal approved: Rs. 1000\nWithdrawal approved: Rs. 1500\nWithdrawal approved: Rs. 500\nRemaining balance: Rs. 2000"
  },
  {
    id: 9,
    slug: 'do-while-loop-restaurant-ordering-system',
    title: 'Do-While Loop – Restaurant Ordering System',
    topic: 'Do-While Loop',
    question: 'Use a do-while loop to process at least one restaurant order and calculate the bill.',
    code: String.raw`<?php
$orders = [
    ['item' => 'Burger', 'price' => 180],
    ['item' => 'Juice', 'price' => 80]
];
$index = 0;
$total = 0;

do {
    echo $orders[$index]['item'] . ": Rs. " . $orders[$index]['price'] . "\n";
    $total = $total + $orders[$index]['price'];
    $index++;
} while ($index < count($orders));

echo "Total bill: Rs. " . $total;
?>`,
    inputs: [],
    features: ['do-while-loop', 'nested-array', 'increment'],
    demoOutput: "Burger: Rs. 180\nJuice: Rs. 80\nTotal bill: Rs. 260"
  },
  {
    id: 10,
    slug: 'nested-loops-college-timetable',
    title: 'Nested Loops – College Timetable',
    topic: 'Nested Loops',
    question: 'Use nested loops to print a timetable for multiple days and periods.',
    code: String.raw`<?php
$days = ["Monday", "Tuesday", "Wednesday"];
$subjects = ["PHP", "Database", "Networking"];

for ($day = 0; $day < count($days); $day++) {
    echo $days[$day] . ":\n";
    for ($period = 0; $period < count($subjects); $period++) {
        echo "  Period " . ($period + 1) . ": " . $subjects[$period] . "\n";
    }
}
?>`,
    inputs: [],
    features: ['nested-for-loops', 'indexed-array'],
    demoOutput: "Monday:\n  Period 1: PHP\n  Period 2: Database\n  Period 3: Networking\nTuesday:\n  Period 1: PHP\n  Period 2: Database\n  Period 3: Networking\nWednesday:\n  Period 1: PHP\n  Period 2: Database\n  Period 3: Networking\n"
  },
  {
    id: 11,
    slug: 'arrays-student-marks-analysis',
    title: 'Arrays – Student Marks Analysis',
    topic: 'Arrays',
    question: 'Store marks in an indexed array and calculate the total, average, and highest mark.',
    code: String.raw`<?php
$marks = [78, 85, 92, 69, 88];
$total = 0;
$highest = $marks[0];

foreach ($marks as $mark) {
    $total = $total + $mark;
    if ($mark > $highest) {
        $highest = $mark;
    }
}

$average = $total / count($marks);
echo "Total: " . $total . "\n";
echo "Average: " . $average . "\n";
echo "Highest: " . $highest;
?>`,
    inputs: [],
    features: ['indexed-array', 'foreach', 'count', 'conditional'],
    demoOutput: "Total: 412\nAverage: 82.4\nHighest: 92"
  },
  {
    id: 12,
    slug: 'associative-arrays-hospital-patient-record',
    title: 'Associative Arrays – Hospital Patient Record',
    topic: 'Associative Arrays',
    question: 'Create an associative array for a hospital patient and display each record field.',
    code: String.raw`<?php
$patient = [
    'name' => 'Anita Sharma',
    'age' => 34,
    'department' => 'Cardiology',
    'room' => '204'
];

foreach ($patient as $field => $value) {
    echo ucfirst($field) . ": " . $value . "\n";
}
?>`,
    inputs: [],
    features: ['associative-array', 'foreach', 'string-function'],
    demoOutput: "Name: Anita Sharma\nAge: 34\nDepartment: Cardiology\nRoom: 204\n"
  },
  {
    id: 13,
    slug: 'user-defined-functions-bus-fare-calculator',
    title: 'User-Defined Functions – Bus Fare Calculator',
    topic: 'User-Defined Functions',
    question: 'Define a reusable function that calculates a bus fare from distance and passenger type.',
    code: String.raw`<?php
function calculateFare($distance, $passengerType) {
    $fare = $distance * 8;
    if ($passengerType == "student") {
        $fare = $fare * 0.50;
    } elseif ($passengerType == "senior") {
        $fare = $fare * 0.60;
    }
    return $fare;
}

$fare = calculateFare(12, "student");
echo "Bus fare: Rs. " . $fare;
?>`,
    inputs: [
      { name: 'distance', label: 'Distance (km)', type: 'number', value: 12, min: 1 },
      { name: 'passengerType', label: 'Passenger type', type: 'select', value: 'student', options: ['regular', 'student', 'senior'] }
    ],
    features: ['user-defined-function', 'parameters', 'return', 'conditional'],
    demoOutput: "Bus fare: Rs. 48"
  },
  {
    id: 14,
    slug: 'function-with-parameters-bmi-calculator',
    title: 'Function with Parameters – BMI Calculator',
    topic: 'Function with Parameters',
    question: 'Create a function with height and weight parameters that calculates BMI and classifies the result.',
    code: String.raw`<?php
function calculateBmi($weight, $height) {
    return $weight / ($height * $height);
}

$weight = 68;
$height = 1.72;
$bmi = calculateBmi($weight, $height);

if ($bmi < 18.5) {
    $category = "Underweight";
} elseif ($bmi < 25) {
    $category = "Normal";
} else {
    $category = "Above normal";
}

echo "BMI: " . round($bmi, 2) . "\n";
echo "Category: " . $category;
?>`,
    inputs: [
      { name: 'weight', label: 'Weight (kg)', type: 'number', value: 68, min: 1, step: 0.1 },
      { name: 'height', label: 'Height (m)', type: 'number', value: 1.72, min: 0.5, step: 0.01 }
    ],
    features: ['function', 'parameters', 'return', 'round', 'conditional'],
    demoOutput: "BMI: 22.99\nCategory: Normal"
  },
  {
    id: 15,
    slug: 'recursive-functions-recursive-sum-of-digits',
    title: 'Recursive Functions – Recursive Sum of Digits',
    topic: 'Recursive Functions',
    question: 'Write a recursive function that returns the sum of all digits in a positive integer.',
    code: String.raw`<?php
function sumOfDigits($number) {
    if ($number < 10) {
        return $number;
    }
    return ($number % 10) + sumOfDigits(intdiv($number, 10));
}

$number = 5824;
echo "Number: " . $number . "\n";
echo "Sum of digits: " . sumOfDigits($number);
?>`,
    inputs: [{ name: 'number', label: 'Positive integer', type: 'number', value: 5824, min: 0, step: 1 }],
    features: ['recursive-function', 'base-case', 'modulo', 'intdiv'],
    demoOutput: "Number: 5824\nSum of digits: 19"
  },
  {
    id: 16,
    slug: 'string-functions-product-search',
    title: 'String Functions – Product Search',
    topic: 'String Functions',
    question: 'Search a product catalogue using string functions and display matching products.',
    code: String.raw`<?php
$products = ["Laptop Stand", "Wireless Mouse", "Laptop Bag", "USB Hub"];
$search = "laptop";
$matches = [];

foreach ($products as $product) {
    if (stripos($product, $search) !== false) {
        $matches[] = $product;
    }
}

echo "Search: " . $search . "\n";
echo "Matches found: " . count($matches) . "\n";
echo implode(", ", $matches);
?>`,
    inputs: [{ name: 'search', label: 'Search term', type: 'text', value: 'laptop' }],
    features: ['string-search', 'stripos', 'implode', 'foreach'],
    demoOutput: "Search: laptop\nMatches found: 2\nLaptop Stand, Laptop Bag"
  },
  {
    id: 17,
    slug: 'include-require-college-website',
    title: 'Include / Require – College Website',
    topic: 'Include / Require',
    question: 'Use require and include to compose a small college website from reusable header, content, and footer files.',
    code: String.raw`<?php
require 'header.php';
include 'content.php';
include 'footer.php';
?>`,
    files: {
      'header.php': String.raw`<?php echo "<header><h1>ABC College</h1></header>"; ?>`,
      'content.php': String.raw`<?php echo "<main><p>Welcome to the college website.</p></main>"; ?>`,
      'footer.php': String.raw`<?php echo "<footer>Admissions Office</footer>"; ?>`
    },
    inputs: [],
    features: ['require', 'include', 'multi-file', 'mixed-html'],
    demoOutput: "<header><h1>ABC College</h1></header><main><p>Welcome to the college website.</p></main><footer>Admissions Office</footer>"
  },
  {
    id: 18,
    slug: 'get-post-online-food-order-form',
    title: 'GET / POST – Online Food Order Form',
    topic: 'GET / POST',
    question: 'Build an HTML order form using POST and display the submitted food item and quantity on the server side.',
    code: String.raw`<form method="post">
  <label>Food item <input type="text" name="food" value="Pizza"></label>
  <label>Quantity <input type="number" name="quantity" value="2" min="1"></label>
  <button type="submit">Place order</button>
</form>
<?php
$food = $_POST['food'] ?? 'Pizza';
$quantity = (int) ($_POST['quantity'] ?? 2);
echo "Order received: " . htmlspecialchars($quantity . " x " . $food);
?>`,
    inputs: [
      { name: 'food', label: 'Food item', type: 'text', value: 'Pizza', method: 'POST' },
      { name: 'quantity', label: 'Quantity', type: 'number', value: 2, min: 1, method: 'POST' }
    ],
    request: { method: 'POST', query: {}, body: { food: 'Pizza', quantity: 2 } },
    features: ['html-form', 'post', 'superglobal', 'null-coalescing', 'htmlspecialchars'],
    demoOutput: "<form method=\"post\">\n  <label>Food item <input type=\"text\" name=\"food\" value=\"Pizza\"></label>\n  <label>Quantity <input type=\"number\" name=\"quantity\" value=\"2\" min=\"1\"></label>\n  <button type=\"submit\">Place order</button>\n</form>\nOrder received: 2 x Pizza"
  },
  {
    id: 19,
    slug: 'form-validation-job-application',
    title: 'Form Validation – Job Application',
    topic: 'Form Validation',
    question: 'Create a job application form and validate that the applicant name, email, and experience are valid before accepting it.',
    code: String.raw`<form method="post">
  <label>Name <input type="text" name="name" value="Ravi Kumar"></label>
  <label>Email <input type="email" name="email" value="ravi@example.com"></label>
  <label>Experience <input type="number" name="experience" value="2" min="0"></label>
  <button type="submit">Apply</button>
</form>
<?php
$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$experience = (int) ($_POST['experience'] ?? 0);
$errors = [];

if ($name === '') {
    $errors[] = 'Name is required';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'A valid email is required';
}
if ($experience < 0) {
    $errors[] = 'Experience cannot be negative';
}

if (count($errors) === 0) {
    echo "Application accepted for " . htmlspecialchars($name);
} else {
    echo "Application errors: " . implode(", ", $errors);
}
?>`,
    inputs: [
      { name: 'name', label: 'Applicant name', type: 'text', value: 'Ravi Kumar', method: 'POST' },
      { name: 'email', label: 'Email', type: 'email', value: 'ravi@example.com', method: 'POST' },
      { name: 'experience', label: 'Experience (years)', type: 'number', value: 2, min: 0, method: 'POST' }
    ],
    request: { method: 'POST', query: {}, body: { name: 'Ravi Kumar', email: 'ravi@example.com', experience: 2 } },
    features: ['html-form', 'post', 'validation', 'filter-var', 'errors-array', 'mixed-html'],
    demoOutput: "<form method=\"post\">\n  <label>Name <input type=\"text\" name=\"name\" value=\"Ravi Kumar\"></label>\n  <label>Email <input type=\"email\" name=\"email\" value=\"ravi@example.com\"></label>\n  <label>Experience <input type=\"number\" name=\"experience\" value=\"2\" min=\"0\"></label>\n  <button type=\"submit\">Apply</button>\n</form>\nApplication accepted for Ravi Kumar"
  }
];

export { PROGRAMS };
export default PROGRAMS;
