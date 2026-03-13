/**
 * Realistic member profiles for seeding. 10 members.
 */
export interface MemberSpec {
  phone: string;
  name: string;
  email?: string;
  notes?: string;
  memberStatus: "ACTIVE" | "INACTIVE" | "PROSPECT" | "VIP";
}

export const MEMBER_SPECS: MemberSpec[] = [
  {
    phone: "9800000001",
    name: "Ram Sharma",
    email: "ram@example.com",
    notes: "VIP customer",
    memberStatus: "VIP",
  },
  {
    phone: "9800000002",
    name: "Sita Devi",
    email: "sita@example.com",
    memberStatus: "ACTIVE",
  },
  {
    phone: "9800000003",
    name: "Gita Karki",
    email: "gita@example.com",
    memberStatus: "ACTIVE",
  },
  {
    phone: "9800000004",
    name: "Krishna Thapa",
    email: "krishna@example.com",
    memberStatus: "VIP",
  },
  {
    phone: "9800000005",
    name: "Anita Gurung",
    email: "anita@example.com",
    memberStatus: "ACTIVE",
  },
  { phone: "9800000006", name: "Bikash Rai", memberStatus: "PROSPECT" },
  {
    phone: "9800000007",
    name: "Puja Maharjan",
    email: "puja@example.com",
    memberStatus: "ACTIVE",
  },
  {
    phone: "9800000008",
    name: "Rajesh Shrestha",
    email: "rajesh@example.com",
    memberStatus: "INACTIVE",
  },
  {
    phone: "9800000009",
    name: "Sunita Basnet",
    email: "sunita@example.com",
    memberStatus: "ACTIVE",
  },
  {
    phone: "9800000010",
    name: "Manoj Adhikari",
    email: "manoj@example.com",
    memberStatus: "ACTIVE",
  },
];
