export type Relationship =
    "self" | "anonymous" | "none" | "request_sent" | "request_received" | "friends";

export type FriendRequestDirection = "received" | "sent";

export interface FriendRequestItem {
    id: string;
    created_at: string;
    slug: string;
    name: string;
    avatar_url: string | null;
}

export interface FriendRequestResult {
    id: string;
    status: "pending" | "accepted";
}

export interface TopFriendsResult {
    count: number;
}
