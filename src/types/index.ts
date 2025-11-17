export interface Employee {
  id: string;
  user_id: string;
  employee_number: string;
  department_id: string;
  position: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern';
  hire_date: string;
  termination_date?: string;
  status: 'active' | 'inactive' | 'terminated';
  manager_id?: string;
  salary: number;
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
  users?: {
    full_name: string;
    email: string;
    phone?: string;
  };
  departments?: {
    name: string;
  };
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  manager_id?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes?: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approver_id?: string;
  approval_date?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
  leave_types?: {
    name: string;
  };
  employees?: {
    users?: {
      full_name: string;
    };
  };
}

export interface LeaveType {
  id: string;
  name: string;
  annual_quota: number;
  is_paid: boolean;
  requires_approval: boolean;
  created_at: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
  leave_types?: {
    name: string;
  };
}

export interface Expense {
  id: string;
  employee_id: string;
  category_id: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed';
  approver_id?: string;
  approval_date?: string;
  approval_notes?: string;
  created_at: string;
  updated_at: string;
  expense_categories?: {
    name: string;
  };
  employees?: {
    users?: {
      full_name: string;
    };
  };
}

export interface Payslip {
  id: string;
  employee_id: string;
  period_id: string;
  base_salary: number;
  allowances: number;
  bonuses: number;
  gross_pay: number;
  tax: number;
  deductions: number;
  net_pay: number;
  status: 'draft' | 'approved' | 'paid';
  payment_date?: string;
  notes?: string;
  created_at: string;
  payroll_periods?: {
    name: string;
    start_date: string;
    end_date: string;
  };
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  cycle_id: string;
  review_date: string;
  overall_rating: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  comments?: string;
  status: 'draft' | 'submitted' | 'acknowledged';
  created_at: string;
  updated_at: string;
  employees?: {
    users?: {
      full_name: string;
    };
  };
  performance_cycles?: {
    name: string;
  };
}

export interface JobPosting {
  id: string;
  title: string;
  department_id?: string;
  description: string;
  requirements?: string;
  employment_type: string;
  salary_range_min?: number;
  salary_range_max?: number;
  status: 'draft' | 'open' | 'closed' | 'filled';
  posted_date?: string;
  closing_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  departments?: {
    name: string;
  };
}

export interface Applicant {
  id: string;
  job_posting_id: string;
  full_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  cover_letter?: string;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  applied_date: string;
  created_at: string;
  updated_at: string;
  job_postings?: {
    title: string;
  };
}

export interface AttendanceSchedule {
  id: string;
  employee_id: string;
  day_of_week: number;
  check_in_time: string;
  check_out_time: string;
  is_working_day: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeLeaveAllocation {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
  leave_types?: {
    name: string;
    color?: string;
  };
}
