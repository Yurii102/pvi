<?php

class UserModel {
    private $students = [
        [
            'name' => 'Ivan',
            'dob' => '2004-03-15',
            'email' => 'ivan@example.com'
        ],
        [
            'name' => 'Anna',
            'dob' => '2003-12-10',
            'email' => 'anna@example.com'
        ]
    ];

    public function authenticate($name, $dob) {
        foreach ($this->students as $student) {
            if ($student['name'] === $name && $student['dob'] === $dob) {
                return $student; 
            }
        }
        return false;
    }
}