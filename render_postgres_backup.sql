--
-- PostgreSQL database dump
--

\restrict PEVvSlpWcsQCTGsQFMy1n9EHiUyfpadRlQLdSmu6c8SFziHWMsRKNlVzh2m2pBl

-- Dumped from database version 18.1 (Debian 18.1-1.pgdg12+2)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: xavlink_db_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO xavlink_db_user;

--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: xavlink_db_user
--

CREATE TYPE public."AuditAction" AS ENUM (
    'user_suspended',
    'user_unsuspended',
    'user_deleted',
    'user_role_changed',
    'post_deleted',
    'comment_deleted',
    'review_deleted',
    'report_created',
    'report_resolved'
);


ALTER TYPE public."AuditAction" OWNER TO xavlink_db_user;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: xavlink_db_user
--

CREATE TYPE public."NotificationType" AS ENUM (
    'request_received',
    'request_accepted',
    'request_rejected',
    'login_alert',
    'post_liked',
    'message_received',
    'follow',
    'post_commented'
);


ALTER TYPE public."NotificationType" OWNER TO xavlink_db_user;

--
-- Name: ReportStatus; Type: TYPE; Schema: public; Owner: xavlink_db_user
--

CREATE TYPE public."ReportStatus" AS ENUM (
    'pending',
    'resolved',
    'dismissed'
);


ALTER TYPE public."ReportStatus" OWNER TO xavlink_db_user;

--
-- Name: RequestStatus; Type: TYPE; Schema: public; Owner: xavlink_db_user
--

CREATE TYPE public."RequestStatus" AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'completed',
    'cancelled'
);


ALTER TYPE public."RequestStatus" OWNER TO xavlink_db_user;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: xavlink_db_user
--

CREATE TYPE public."Role" AS ENUM (
    'user',
    'moderator',
    'admin'
);


ALTER TYPE public."Role" OWNER TO xavlink_db_user;

--
-- Name: SkillProficiency; Type: TYPE; Schema: public; Owner: xavlink_db_user
--

CREATE TYPE public."SkillProficiency" AS ENUM (
    'beginner',
    'intermediate',
    'expert'
);


ALTER TYPE public."SkillProficiency" OWNER TO xavlink_db_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Achievement; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Achievement" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    icon text,
    "earnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Achievement" OWNER TO xavlink_db_user;

--
-- Name: Activity; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Activity" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" uuid NOT NULL,
    type text NOT NULL,
    description text,
    "postId" uuid,
    "targetUserId" uuid,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Activity" OWNER TO xavlink_db_user;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."AuditLog" (
    id uuid NOT NULL,
    action public."AuditAction" NOT NULL,
    "actorId" uuid NOT NULL,
    "targetId" uuid,
    "targetType" text,
    details text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO xavlink_db_user;

--
-- Name: BlockedUser; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."BlockedUser" (
    id uuid NOT NULL,
    "blockerId" uuid NOT NULL,
    "blockedId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BlockedUser" OWNER TO xavlink_db_user;

--
-- Name: Bookmark; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Bookmark" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "postId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Bookmark" OWNER TO xavlink_db_user;

--
-- Name: Chat; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Chat" (
    id uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isGroupChat" boolean DEFAULT false NOT NULL,
    name text
);


ALTER TABLE public."Chat" OWNER TO xavlink_db_user;

--
-- Name: ChatParticipant; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."ChatParticipant" (
    id uuid NOT NULL,
    "chatId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastReadAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "unreadCount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ChatParticipant" OWNER TO xavlink_db_user;

--
-- Name: Comment; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Comment" (
    id uuid NOT NULL,
    "postId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    text text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Comment" OWNER TO xavlink_db_user;

--
-- Name: DeviceSession; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."DeviceSession" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "deviceId" text NOT NULL,
    "deviceName" text,
    "ipAddress" text,
    "userAgent" text,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DeviceSession" OWNER TO xavlink_db_user;

--
-- Name: Favorite; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Favorite" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "favoriteUserId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Favorite" OWNER TO xavlink_db_user;

--
-- Name: Follow; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Follow" (
    id uuid NOT NULL,
    "followerId" uuid NOT NULL,
    "followingId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Follow" OWNER TO xavlink_db_user;

--
-- Name: Like; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Like" (
    id uuid NOT NULL,
    "postId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Like" OWNER TO xavlink_db_user;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Message" (
    id uuid NOT NULL,
    "chatId" uuid NOT NULL,
    "senderId" uuid NOT NULL,
    text text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "attachmentUrl" text,
    "isPinned" boolean DEFAULT false NOT NULL,
    edited boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Message" OWNER TO xavlink_db_user;

--
-- Name: MessageReaction; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."MessageReaction" (
    id uuid NOT NULL,
    "messageId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    emoji text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MessageReaction" OWNER TO xavlink_db_user;

--
-- Name: MessageRead; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."MessageRead" (
    id uuid NOT NULL,
    "messageId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    "readAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."MessageRead" OWNER TO xavlink_db_user;

--
-- Name: ModNote; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."ModNote" (
    id uuid NOT NULL,
    "reportId" uuid NOT NULL,
    "moderatorId" uuid NOT NULL,
    note text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ModNote" OWNER TO xavlink_db_user;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Notification" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "relatedId" text,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actionUrl" text,
    archived boolean DEFAULT false NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Notification" OWNER TO xavlink_db_user;

--
-- Name: Post; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Post" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "pinnedAt" timestamp(3) without time zone,
    image text,
    "scheduledAt" timestamp without time zone,
    "isScheduled" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Post" OWNER TO xavlink_db_user;

--
-- Name: ProfileView; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."ProfileView" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "viewerId" uuid NOT NULL,
    "viewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProfileView" OWNER TO xavlink_db_user;

--
-- Name: Report; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Report" (
    id uuid NOT NULL,
    "reporterId" uuid NOT NULL,
    reason text NOT NULL,
    description text NOT NULL,
    "reportedUserId" uuid,
    "reportedPostId" uuid,
    status public."ReportStatus" DEFAULT 'pending'::public."ReportStatus" NOT NULL,
    "resolvedBy" uuid,
    "resolutionNote" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reportedMessageId" uuid
);


ALTER TABLE public."Report" OWNER TO xavlink_db_user;

--
-- Name: Request; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Request" (
    id uuid NOT NULL,
    "fromUserId" uuid NOT NULL,
    "toUserId" uuid NOT NULL,
    "skillId" uuid NOT NULL,
    status public."RequestStatus" DEFAULT 'pending'::public."RequestStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "counterOffer" text,
    "counterPrice" text,
    deadline timestamp(3) without time zone,
    "isUrgent" boolean DEFAULT false NOT NULL,
    message text,
    "reminderSentAt" timestamp(3) without time zone
);


ALTER TABLE public."Request" OWNER TO xavlink_db_user;

--
-- Name: RequestTemplate; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."RequestTemplate" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RequestTemplate" OWNER TO xavlink_db_user;

--
-- Name: Review; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Review" (
    id uuid NOT NULL,
    "authorId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Review" OWNER TO xavlink_db_user;

--
-- Name: Skill; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."Skill" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    "priceRange" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    proficiency public."SkillProficiency" DEFAULT 'beginner'::public."SkillProficiency" NOT NULL,
    subcategory text
);


ALTER TABLE public."Skill" OWNER TO xavlink_db_user;

--
-- Name: SkillCertification; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."SkillCertification" (
    id uuid NOT NULL,
    "skillId" uuid NOT NULL,
    name text NOT NULL,
    issuer text NOT NULL,
    "issueDate" timestamp(3) without time zone,
    "expiryDate" timestamp(3) without time zone,
    "certificateUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SkillCertification" OWNER TO xavlink_db_user;

--
-- Name: SkillEndorsement; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."SkillEndorsement" (
    id uuid NOT NULL,
    "skillId" uuid NOT NULL,
    "endorserId" uuid NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SkillEndorsement" OWNER TO xavlink_db_user;

--
-- Name: SkillRecommendation; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."SkillRecommendation" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "userId" uuid NOT NULL,
    "skillName" text NOT NULL,
    reason text NOT NULL,
    score numeric(3,2) NOT NULL,
    "createdAt" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SkillRecommendation" OWNER TO xavlink_db_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."User" (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    course text,
    year integer,
    bio text,
    "profilePic" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "followersCount" integer DEFAULT 0 NOT NULL,
    "followingCount" integer DEFAULT 0 NOT NULL,
    "postsCount" integer DEFAULT 0 NOT NULL,
    "resetToken" text,
    "resetTokenExpiry" timestamp(3) without time zone,
    "isSuspended" boolean DEFAULT false NOT NULL,
    role public."Role" DEFAULT 'user'::public."Role" NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "verificationToken" text,
    "verificationTokenExpiry" timestamp(3) without time zone,
    "suspensionEndsAt" timestamp(3) without time zone,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "twoFactorSecret" text,
    "githubUrl" text,
    "lastActiveAt" timestamp(3) without time zone,
    "linkedInUrl" text,
    "portfolioUrl" text,
    "profileViews" integer DEFAULT 0 NOT NULL,
    "linkedInVerified" boolean DEFAULT false NOT NULL,
    "githubVerified" boolean DEFAULT false NOT NULL,
    "portfolioVerified" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."User" OWNER TO xavlink_db_user;

--
-- Name: UserPhoto; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."UserPhoto" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    url text NOT NULL,
    caption text,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserPhoto" OWNER TO xavlink_db_user;

--
-- Name: UserSettings; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public."UserSettings" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    "isPrivateProfile" boolean DEFAULT false NOT NULL,
    "allowMessages" text DEFAULT 'everyone'::text NOT NULL,
    "allowRequestsFromAll" boolean DEFAULT true NOT NULL,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "pushNotifications" boolean DEFAULT true NOT NULL,
    "requestNotifications" boolean DEFAULT true NOT NULL,
    "messageNotifications" boolean DEFAULT true NOT NULL,
    "activityNotifications" boolean DEFAULT true NOT NULL,
    theme text DEFAULT 'dark'::text NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    "twoFactorEnabled" boolean DEFAULT false NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "commentNotifications" boolean DEFAULT true NOT NULL,
    "followNotifications" boolean DEFAULT true NOT NULL,
    "likeNotifications" boolean DEFAULT true NOT NULL,
    "quietHoursEnd" text,
    "quietHoursStart" text,
    "colorPalette" text DEFAULT 'champagne'::text NOT NULL
);


ALTER TABLE public."UserSettings" OWNER TO xavlink_db_user;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: xavlink_db_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO xavlink_db_user;

--
-- Data for Name: Achievement; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Achievement" (id, "userId", type, title, description, icon, "earnedAt") FROM stdin;
\.


--
-- Data for Name: Activity; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Activity" (id, "userId", type, description, "postId", "targetUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."AuditLog" (id, action, "actorId", "targetId", "targetType", details, "createdAt") FROM stdin;
3d9138cf-78d8-4866-9c2d-cad2ce4c5954	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	271f335a-eb17-4d01-8022-ae3b0f1a8858	post	{"preview":"hi i am kelvin"}	2026-01-06 13:41:52.302
e6cd5175-eb2c-4568-a3aa-e14e89bd2685	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	efbcb512-196c-4343-a257-088259955ccb	report	{"status":"resolved","resolutionNote":""}	2026-01-06 13:42:00.651
474c9b4f-8c2b-4afd-886e-c0993b73e96a	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	97c82874-67d6-4eae-b938-3ef48c1915f3	post	{"preview":"hi i am kelvin"}	2026-01-06 13:49:10.507
5dc784a3-9eac-4593-8f12-7f4947980c63	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	8df16e5d-c5d7-4166-af68-266a06cfae2e	post	{"preview":"hi"}	2026-01-06 13:49:59.149
f2c47e8c-665e-4a28-a128-9ba0a02a9588	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	82279aa3-e04d-4b48-891e-49d1c74e93ba	report	{"status":"resolved","resolutionNote":""}	2026-01-06 15:55:20.155
b225a41c-0240-440c-970d-540339159a2e	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	f403bdf8-df99-4d00-932d-bd1b09a8e810	report	{"status":"resolved","resolutionNote":""}	2026-01-06 16:01:36.217
5f87aa62-42ff-4003-8982-140375fb90df	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	0aed795f-2b9f-4edf-b3f5-0f378f51114d	report	{"status":"resolved","resolutionNote":""}	2026-01-06 16:11:30.918
957117d3-4eb4-49b8-8d86-8e9b94e192b5	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	d883018c-9615-4d78-ad5b-26f443fe5074	report	{"status":"resolved","resolutionNote":""}	2026-01-06 16:17:37.409
38a99078-b643-433e-b53f-45c2d13d548d	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	4cf8d6a3-282e-490e-a6fb-8018fae92cc9	report	{"status":"resolved","resolutionNote":""}	2026-01-06 16:18:35.188
6a45039b-f2fe-4402-bab1-c5b0f002b340	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	8e839a4e-9058-462d-b3cb-bfd867065a92	report	{"status":"resolved","resolutionNote":""}	2026-01-06 16:23:13.351
e31beaae-85a2-46f8-906f-c3d737cf7039	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	a56388c1-3f33-4e4b-80f9-67340bdbffe1	report	{"status":"resolved","resolutionNote":""}	2026-01-06 16:24:51.702
66a6b025-e7b1-4f89-a5ba-33aada0102d4	user_suspended	d3fba700-f891-4cc2-8427-6e2a30fee6cf	14f0b0ab-1d2c-4181-865f-039fa3012320	user	{"targetName":"kelvin"}	2026-01-06 16:28:59.45
9211dbca-d364-4780-8e2e-bd3e5181895a	report_resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	7f7508b8-1ca0-4f8b-8614-1b6db7cb8cb0	report	{"status":"resolved","resolutionNote":""}	2026-01-06 16:29:00.683
d2eb1df7-2cc3-4c75-af07-7465a4e4f7eb	user_suspended	d3fba700-f891-4cc2-8427-6e2a30fee6cf	9a8c5aec-2dde-4bee-9ed9-a142382957ae	user	{"targetName":"Alice Example"}	2026-01-06 16:29:18.385
2ac78c5a-545e-40b9-bdaf-9346faf2acff	user_unsuspended	d3fba700-f891-4cc2-8427-6e2a30fee6cf	9a8c5aec-2dde-4bee-9ed9-a142382957ae	user	{"targetName":"Alice Example"}	2026-01-06 16:29:23.668
3ec8dcd7-8d26-458e-8dd6-80161a81b84b	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	be137c2b-197a-45df-bc45-7b0ebff9c279	post	{"preview":"dfd"}	2026-01-08 05:29:47.367
d90dff4f-e682-46a8-a463-737e6dbd23eb	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	4a4b2e90-f7ba-4ccb-b53f-b21c2196692e	post	{"preview":"fdg"}	2026-01-08 05:29:49.365
176f1ea0-5f88-40e3-bf03-e9d0924ba431	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	c63dc3c7-6bfd-4014-abdf-7e5f0bacbb66	post	{"preview":"sd"}	2026-01-08 05:29:51.01
7c0aca81-bc09-4cff-ac67-ae7fc33cfc61	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	dbc8cae9-297c-4e36-99cb-38024ddaef52	post	{"preview":"fgh"}	2026-01-08 05:29:52.35
2659f484-19c7-48ed-9fb2-e6da4ae5ac6c	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	66099c56-55da-47b9-b77e-94f7ef793f57	post	{"preview":"yo"}	2026-01-08 05:29:53.671
290d40cf-b323-45df-b92a-1431e082e3e9	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	cda4e914-05e6-47ae-9934-55914d3c85ec	post	{"preview":"hi"}	2026-01-08 05:29:54.96
d7267e9f-d033-4c61-8b9c-5b1fe8ff02a8	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	fa0d6450-1af5-4fd8-aa4a-9ff04cd814fe	post	{"preview":"hi"}	2026-01-08 05:29:56.983
a9161e61-6956-4a88-a848-299a35cd4415	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	cb6e2190-41f5-4ddb-a059-8543db796675	post	{"preview":"Testing image post functionality."}	2026-01-08 05:29:58.453
3bb3e407-6e93-40eb-a7be-8ce6c988ac8a	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	88585e1b-a1b9-459b-b8d3-03c6b073c51e	post	{"preview":"Testing XavLink - This is a test post from Manus AI."}	2026-01-08 05:29:59.552
5c5fa711-d721-4d09-ab32-588a313a6e07	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	d781e168-0738-43de-b516-66e89f952ea8	post	{"preview":"hi\\n"}	2026-01-08 05:30:01.244
5dcd6735-b5cb-4f58-a95c-4d7b5fc0efad	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	cab8fcba-3313-4f7e-a7c1-3f58a6c75b52	post	{"preview":"sdfcg"}	2026-01-08 05:36:12.3
35058acb-7e93-48bc-969e-a5dfae665ae9	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	edb7a8ea-69cc-4404-b3dd-0b0ba5819514	post	{"preview":"h"}	2026-01-08 05:36:14.135
70c48b67-f160-46da-8481-eba12578bb49	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	9e2072b7-5a96-4028-9409-8d68af1f785b	post	{"preview":"fv"}	2026-01-08 06:25:49.391
ad3d7f39-f582-4b41-8536-4cbc052d7a92	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	bc8c8887-5aae-4009-8be9-222691cdd4bf	post	{"preview":"esgdfhgfh"}	2026-01-08 06:25:51.643
6c98a95b-ea1a-4b37-af76-b951b0a63723	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	24edf6f2-f1fd-4515-8b57-3470428f42c0	post	{"preview":"g"}	2026-01-08 06:26:40.176
b9f01d8c-81a3-49f0-9158-c7bbf1d311e7	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	4d9c1433-0dc4-4dcb-8050-c5fe4b2f8a60	post	{"preview":"cv"}	2026-01-08 07:13:43.627
9fe3add0-16e4-4f06-836e-ec773defe6d7	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	538c3037-4199-4322-86cd-ce8821168238	post	{"preview":"f"}	2026-01-08 07:13:45.7
5de78664-82ba-4b74-a31e-fe7493dcfd76	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	50ceb315-55bb-43e8-b5e5-f26c62d47d52	post	{"preview":"sfdgfgn"}	2026-01-08 07:13:47.374
130ea3f8-5c45-4096-990a-05dacca9a7be	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	44135e0d-9a6d-4256-9360-1c9138617a6e	post	{"preview":"sdc"}	2026-01-12 16:09:56.846
96c074cf-bb1a-458d-b662-f18408e15076	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	16f92a53-b9e7-4bf6-917e-4877be1064c8	post	{"preview":"gdg"}	2026-01-12 16:09:59.977
8b5757e9-3ed5-4422-b333-f6b3eb6216b8	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	7489f0d2-0f49-4ae4-95cd-f3e47263b0f3	post	{"preview":"#kelvin"}	2026-01-12 16:10:06.227
77425613-705b-4de5-aa2e-2ae52d02c445	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	1ec05f0d-c10b-438b-957b-b17e4f9ceee6	post	{"preview":"dfdgn"}	2026-01-12 16:10:10.333
bb4a7bfd-a503-4cdb-a3dd-c98645b7a446	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	47d2bf7e-1bf7-4e21-ad27-8f59255147fa	post	{"preview":"gf"}	2026-01-12 16:10:12.997
273dbf97-84bd-4056-92b0-a9949b7856d5	post_deleted	d3fba700-f891-4cc2-8427-6e2a30fee6cf	20cea4a9-65d4-4fed-ba84-d9c543c258f4	post	{"preview":"cdfgh"}	2026-01-12 16:10:16.006
\.


--
-- Data for Name: BlockedUser; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."BlockedUser" (id, "blockerId", "blockedId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Bookmark; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Bookmark" (id, "userId", "postId", "createdAt") FROM stdin;
86dbd810-7e21-47dd-85cb-b180f56fd28c	d3fba700-f891-4cc2-8427-6e2a30fee6cf	1ec05f0d-c10b-438b-957b-b17e4f9ceee6	2026-01-08 10:10:52.313
\.


--
-- Data for Name: Chat; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Chat" (id, "createdAt", "isGroupChat", name) FROM stdin;
3c2d83c0-32fc-4c21-bf68-c4fea9f99968	2026-01-06 03:45:37.61	f	\N
935259c5-f9e3-40fa-9314-ac2b7990be3c	2026-01-06 05:48:39.537	f	\N
43816e87-6662-435d-a919-002e6138ef4d	2026-01-07 15:23:32.22	f	\N
0038f158-f86e-427d-b354-78dae02a46e2	2026-01-07 15:30:09.544	f	\N
\.


--
-- Data for Name: ChatParticipant; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."ChatParticipant" (id, "chatId", "userId", "joinedAt", "lastReadAt", "unreadCount") FROM stdin;
b5081779-b53a-477a-bb6f-c3f844eca4d2	43816e87-6662-435d-a919-002e6138ef4d	9a8c5aec-2dde-4bee-9ed9-a142382957ae	2026-01-07 15:23:32.22	2026-01-07 15:23:32.22	1
52f095d9-a981-4736-897a-6745203e7132	43816e87-6662-435d-a919-002e6138ef4d	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-07 15:23:32.22	2026-01-08 06:53:36.453	0
49fde43f-79dd-46bd-99d8-6045f913bd4f	0038f158-f86e-427d-b354-78dae02a46e2	a56b1389-3576-4eda-a646-52c96b9884fb	2026-01-07 15:30:09.544	2026-01-07 15:30:09.544	1
55462da9-f28d-48ba-94cd-6d5fc68c5427	0038f158-f86e-427d-b354-78dae02a46e2	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-07 15:30:09.544	2026-01-08 07:32:11.84	0
59249be6-a7c7-4a31-9ef2-0544a332d627	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-06 03:45:37.61	2026-01-08 17:16:11.537	0
4b282af7-2c9a-492c-98f9-4216d89cfa5a	935259c5-f9e3-40fa-9314-ac2b7990be3c	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 05:48:39.537	2026-01-08 18:34:23.316	0
c5e4ed10-d727-4062-938d-8c5bf02916d8	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 03:45:37.61	2026-01-08 18:34:29.594	0
\.


--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Comment" (id, "postId", "userId", text, "createdAt") FROM stdin;
\.


--
-- Data for Name: DeviceSession; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."DeviceSession" (id, "userId", "deviceId", "deviceName", "ipAddress", "userAgent", "lastActiveAt", "createdAt") FROM stdin;
744d0935-d786-4353-a5d7-69934bbe9a53	d3fba700-f891-4cc2-8427-6e2a30fee6cf	ee9f6bd8973e3826	Windows PC	10.24.250.138	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-12 16:14:47.142	2026-01-11 18:28:15.044
82e46d0a-6898-4d3b-a401-0469c66788ed	d3fba700-f891-4cc2-8427-6e2a30fee6cf	f7f1341b8cbabb63	Windows PC	10.24.91.33	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 18:32:02.387	2026-01-13 05:52:50.573
a55470fe-29f7-4d81-bf70-711e73b2b431	ae2f98a5-6ba9-44c1-a469-0e43f67b84a6	14d1e14100bf50c2	Windows PC	10.25.52.91	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/125.0.0.0 (Edition std-2)	2026-01-14 16:39:35.863	2026-01-13 06:02:00.753
d7d0b988-f2d9-4395-8ecf-8e4f75844ef7	ae2f98a5-6ba9-44c1-a469-0e43f67b84a6	f2440f2ee9d4d501	Windows PC	10.24.191.130	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/125.0.0.0 (Edition std-2)	2026-01-14 16:40:35.887	2026-01-13 04:50:58.665
bf12d175-6810-4dc7-b65f-fb6c106a9121	ae2f98a5-6ba9-44c1-a469-0e43f67b84a6	956debd2c1b79dea	Windows PC	10.24.166.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 OPR/125.0.0.0 (Edition std-2)	2026-01-14 16:42:19.505	2026-01-13 06:06:35.65
c1e703e0-46bc-48dc-b9d0-9e0526bb9fe1	d3fba700-f891-4cc2-8427-6e2a30fee6cf	4291ef3c598ffe2c	Windows PC	10.24.166.3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-01-13 18:13:02.24	2026-01-13 05:52:03.476
\.


--
-- Data for Name: Favorite; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Favorite" (id, "userId", "favoriteUserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Follow; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Follow" (id, "followerId", "followingId", "createdAt") FROM stdin;
ebea20b9-3abc-4598-853c-92955571e618	d3fba700-f891-4cc2-8427-6e2a30fee6cf	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-08 18:32:19.73
46a9e8bd-af94-4123-9245-b35c9798de05	14f0b0ab-1d2c-4181-865f-039fa3012320	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-08 18:53:00.363
\.


--
-- Data for Name: Like; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Like" (id, "postId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Message" (id, "chatId", "senderId", text, "timestamp", "attachmentUrl", "isPinned", edited) FROM stdin;
e9a26033-c784-4232-9e59-6f8fc3029529	935259c5-f9e3-40fa-9314-ac2b7990be3c	14f0b0ab-1d2c-4181-865f-039fa3012320	k	2026-01-06 06:07:36.696	\N	f	f
beef1fcb-daaf-42ae-8467-4071fc50a501	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	l	2026-01-06 06:20:45.685	\N	f	f
416d7b0b-5e84-4a15-8093-7c56198b5f9e	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	hh	2026-01-06 06:47:04.279	\N	f	f
9e1b2b6b-4216-4b89-9823-e42c6a772eb4	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	g	2026-01-06 12:47:50.692	https://xavlink-backend.onrender.com/uploads/chats/Gemini_Generated_Image_ipmoh6ipmoh6ipmo-1767703651069-525234256.png	f	f
06f77508-0b51-48d6-835d-89803372121d	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	h	2026-01-06 13:17:12.574	https://xavlink-backend.onrender.com/uploads/chats/dashboard_render_com_project_prj-d5durrf5r7bs73c7h-1767705429150-172452064.png	f	f
e3724db5-6820-40ef-9342-3d524fcb9ff1	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	h	2026-01-06 16:18:03.338	\N	f	f
b175f85b-c645-4195-bf8d-74f74e29cdf0	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf		2026-01-06 13:16:08.865	https://xavlink-backend.onrender.com/uploads/chats/Gemini_Generated_Image_x5d2mix5d2mix5d2-1767705349706-882551523.png	f	f
4a8f38c1-63e1-416d-b620-2333783a2c4d	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	h	2026-01-06 14:58:39.181	\N	f	f
cb63db76-515d-4fea-a6cc-3d1e8952040a	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	h	2026-01-06 18:15:28.803	\N	f	f
a6f1490f-2682-43aa-9f14-395b8a338c17	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	h	2026-01-06 18:45:15.216	\N	f	f
f22d6b41-dc83-47e2-bb34-ae1829e60f6c	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	k'	2026-01-06 18:45:44.998	\N	f	f
8bc518e9-680b-479e-a08b-b6cd5bdb2a64	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	l	2026-01-06 18:52:05.936	\N	f	f
216505c1-80d2-4075-bfa7-4274dce2a03e	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	kj	2026-01-06 18:52:14.89	\N	f	f
31cba9a3-98b1-4ffa-a04b-1fbdb3fd3f93	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf		2026-01-06 20:12:03.131	https://xavlink-backend.onrender.com/uploads/chats/Gemini_Generated_Image_x5d2mix5d2mix5d2-1767730315532-736070063.png	f	f
ec91b4a9-cc05-4ed8-8108-679a5fd189ad	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	hi	2026-01-07 04:49:28.788	\N	f	f
8e0ef6b9-7ee4-4188-8bf2-782d64035d5d	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	hi	2026-01-07 04:49:55.892	\N	f	f
df51eb70-e75f-4508-91fb-7aa7683404ed	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	h	2026-01-07 15:20:31.61	\N	f	f
a867cf2a-9997-40e8-bdc6-0a0c2a475f59	43816e87-6662-435d-a919-002e6138ef4d	d3fba700-f891-4cc2-8427-6e2a30fee6cf	h	2026-01-07 15:23:37.251	\N	f	f
77416ebe-b14a-4b08-9bf3-c2d4b71367de	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	h	2026-01-07 16:04:07.686	\N	f	f
6c843d40-9865-4659-b73c-a8911658b935	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf		2026-01-07 13:57:55.153	https://xavlink-backend.onrender.com/uploads/chats/adaptive-icon-1767794271095-235952164.png	f	f
c8faad94-0ad7-4d0b-990f-ddc56b2a1a01	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	hi	2026-01-07 14:01:25.096	\N	f	f
96fa0560-1707-4b59-96c7-058bdb035eda	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	d3fba700-f891-4cc2-8427-6e2a30fee6cf	h	2026-01-06 18:00:24.456	\N	f	f
ac2f710c-a628-48cf-88d2-6278965de5f8	3c2d83c0-32fc-4c21-bf68-c4fea9f99968	14f0b0ab-1d2c-4181-865f-039fa3012320	k	2026-01-06 18:51:17.632	\N	f	f
99683e6d-a6df-4677-ac2c-dbe642002e37	0038f158-f86e-427d-b354-78dae02a46e2	d3fba700-f891-4cc2-8427-6e2a30fee6cf		2026-01-08 07:28:09.605	https://xavlink-backend.onrender.com/uploads/chats/Screen_Recording_2026-01-08_122540-1767857284707-866688611.mp4	f	f
\.


--
-- Data for Name: MessageReaction; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."MessageReaction" (id, "messageId", "userId", emoji, "createdAt") FROM stdin;
e619cd6e-0770-4e5e-884a-1373630a8fa4	96fa0560-1707-4b59-96c7-058bdb035eda	14f0b0ab-1d2c-4181-865f-039fa3012320	­ƒæì	2026-01-06 18:00:36.222
ecfa996c-c955-498c-91fd-0d503db3db84	a867cf2a-9997-40e8-bdc6-0a0c2a475f59	d3fba700-f891-4cc2-8427-6e2a30fee6cf	­ƒÿó	2026-01-07 15:23:40.547
cf289ce1-366b-4ded-9a37-85586c3cd22c	77416ebe-b14a-4b08-9bf3-c2d4b71367de	14f0b0ab-1d2c-4181-865f-039fa3012320	­ƒÖÅ	2026-01-07 18:42:55.574
5a33a8ca-cf41-4fb4-98a2-e6ca9c939e7f	77416ebe-b14a-4b08-9bf3-c2d4b71367de	14f0b0ab-1d2c-4181-865f-039fa3012320	­ƒæì	2026-01-07 18:42:56.889
15609fd9-066b-4afb-9340-af1c2a416070	6c843d40-9865-4659-b73c-a8911658b935	14f0b0ab-1d2c-4181-865f-039fa3012320	­ƒÆ¬	2026-01-07 18:43:00.877
a10b8dc0-fdfb-470b-ba70-fc321ec11ded	6c843d40-9865-4659-b73c-a8911658b935	14f0b0ab-1d2c-4181-865f-039fa3012320	ÔØñ´©Å	2026-01-07 18:43:02.958
3008e80b-837c-4667-8fd7-f9ba55af3f20	6c843d40-9865-4659-b73c-a8911658b935	14f0b0ab-1d2c-4181-865f-039fa3012320	­ƒæÅ	2026-01-07 18:43:14.96
\.


--
-- Data for Name: MessageRead; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."MessageRead" (id, "messageId", "userId", "readAt") FROM stdin;
e822e174-ff20-4cce-8ae3-30357afc707a	e3724db5-6820-40ef-9342-3d524fcb9ff1	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-06 18:15:58.898
d84c1eb0-fd01-48cd-8e47-a2453892506a	beef1fcb-daaf-42ae-8467-4071fc50a501	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:00.018
dff89e70-b7de-4f8c-ad4b-b49474ebae1b	416d7b0b-5e84-4a15-8093-7c56198b5f9e	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:01.123
bc3e7d90-89d0-46fb-acc5-283be3cdfb94	9e1b2b6b-4216-4b89-9823-e42c6a772eb4	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:02.024
04395168-d732-4219-8a19-f51b73aa411e	b175f85b-c645-4195-bf8d-74f74e29cdf0	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:02.652
a1b170eb-fb0d-4f80-bc79-6b2ca8b10268	06f77508-0b51-48d6-835d-89803372121d	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:03.238
77cefa08-74cc-40b9-9144-bb895fa986c3	4a8f38c1-63e1-416d-b620-2333783a2c4d	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:04.14
e8dca384-441c-46ee-bb70-ba9e3d84aece	96fa0560-1707-4b59-96c7-058bdb035eda	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:04.74
92fcb7e2-3990-4985-a70b-eea324114366	cb63db76-515d-4fea-a6cc-3d1e8952040a	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 18:16:05.315
27bb13f7-fc3b-4cba-b14c-b7566f838c05	a6f1490f-2682-43aa-9f14-395b8a338c17	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-06 18:51:45.071
5a87c13d-198b-4128-b4b2-bbf2a2d238e8	f22d6b41-dc83-47e2-bb34-ae1829e60f6c	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-06 18:51:46.656
298967e5-a2d2-4fdc-ac00-be11ebb599e5	ac2f710c-a628-48cf-88d2-6278965de5f8	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-06 18:51:47.667
f2183949-1012-40fc-bc58-2df9ce04cecc	8bc518e9-680b-479e-a08b-b6cd5bdb2a64	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-06 18:52:22.448
695b8830-2dfc-4298-9d72-4abfe8c4e9e4	216505c1-80d2-4075-bfa7-4274dce2a03e	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-06 18:52:24.273
821988fd-6b69-433d-a33e-c21b0856e5e4	31cba9a3-98b1-4ffa-a04b-1fbdb3fd3f93	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-06 20:24:17.736
c361efe7-60bf-4077-9dc1-e2007e3a90ce	ec91b4a9-cc05-4ed8-8108-679a5fd189ad	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-07 04:52:02.209
576db4f2-222f-49f2-a097-18e0e198e140	8e0ef6b9-7ee4-4188-8bf2-782d64035d5d	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-07 04:52:03.691
42d6d70c-42da-4912-a052-e0fa3c30d529	6c843d40-9865-4659-b73c-a8911658b935	14f0b0ab-1d2c-4181-865f-039fa3012320	2026-01-07 14:01:17.633
14b2ae9a-84ec-4425-87cd-59ed6a6c7941	c8faad94-0ad7-4d0b-990f-ddc56b2a1a01	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-07 16:25:20.709
e380878b-1645-4671-99ea-528199c05626	df51eb70-e75f-4508-91fb-7aa7683404ed	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-07 16:25:22.421
b75d11c1-9c14-48ed-ac48-aca96efe5889	77416ebe-b14a-4b08-9bf3-c2d4b71367de	d3fba700-f891-4cc2-8427-6e2a30fee6cf	2026-01-07 16:25:23.961
\.


--
-- Data for Name: ModNote; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."ModNote" (id, "reportId", "moderatorId", note, "createdAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Notification" (id, "userId", type, title, message, "relatedId", read, "createdAt", "actionUrl", archived, "isPinned") FROM stdin;
8dd7d269-0185-4f09-8a3e-5d32d4de2748	14f0b0ab-1d2c-4181-865f-039fa3012320	request_rejected	Admin rejected your request	Your skill request has been rejected	00e58726-03b8-4525-9d62-941b52565187	t	2026-01-06 13:24:18.631	\N	f	f
99f58862-2f45-41bb-932a-540768fc9f65	14f0b0ab-1d2c-4181-865f-039fa3012320	request_rejected	Admin rejected your request	Your skill request has been rejected	8212e0cf-a247-4628-95e6-4db11ac0c466	t	2026-01-06 13:24:22.357	\N	f	f
19796cd9-42e6-4a60-ad36-be745319bc92	14f0b0ab-1d2c-4181-865f-039fa3012320	request_accepted	Admin accepted your request	Your skill request has been accepted	c4b119c4-4674-4086-a67c-35be937beba6	t	2026-01-06 13:24:25.701	\N	f	f
61d6ac51-017d-4785-b096-9a2e3d7612ac	d3fba700-f891-4cc2-8427-6e2a30fee6cf	request_received	New Skill Request	kelvin requested your "frontend" skill	c4b119c4-4674-4086-a67c-35be937beba6	t	2026-01-06 13:23:55.538	\N	f	f
fc79d66a-3a2d-46f6-8507-9ea5d733d368	d3fba700-f891-4cc2-8427-6e2a30fee6cf	request_received	New Skill Request	kelvin requested your "frontend" skill	8212e0cf-a247-4628-95e6-4db11ac0c466	t	2026-01-06 13:24:01.113	\N	f	f
d81ef80f-3871-40cc-903f-53bb28569c9c	14f0b0ab-1d2c-4181-865f-039fa3012320	follow	New Follower	Admin started following you	d3fba700-f891-4cc2-8427-6e2a30fee6cf	t	2026-01-06 13:26:10.507	\N	f	f
b4c7048c-4a4b-456a-9a16-fcf69a629e4b	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	271f335a-eb17-4d01-8022-ae3b0f1a8858	t	2026-01-06 13:34:41.371	\N	f	f
303c3d0f-b05c-4dae-bc4e-45c2b13fed7d	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	271f335a-eb17-4d01-8022-ae3b0f1a8858	t	2026-01-06 13:34:44.159	\N	f	f
aa7132a6-78c1-425a-b413-a067f09b54c1	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	271f335a-eb17-4d01-8022-ae3b0f1a8858	t	2026-01-06 13:34:50.573	\N	f	f
4798709c-9c22-4a58-9a3a-7b71d8cc8e2e	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	271f335a-eb17-4d01-8022-ae3b0f1a8858	t	2026-01-06 13:40:30.617	\N	f	f
1555e650-9a29-463f-b8f8-a72fc6a18ac4	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	838ab563-dd5e-4385-ad1c-716d2ed30027	t	2026-01-06 13:56:50.019	\N	f	f
56ec1457-6ce1-4c29-a863-6752582a4fb4	14f0b0ab-1d2c-4181-865f-039fa3012320	post_commented	New Comment	Admin commented on your post	838ab563-dd5e-4385-ad1c-716d2ed30027	t	2026-01-06 14:01:30.452	\N	f	f
a809e14e-db20-45be-b414-a8290a0d0469	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	838ab563-dd5e-4385-ad1c-716d2ed30027	t	2026-01-06 14:03:08.629	\N	f	f
f86fbc6d-8820-4c68-a1c0-411bd6ca0616	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	838ab563-dd5e-4385-ad1c-716d2ed30027	t	2026-01-06 14:03:30.137	\N	f	f
1cf7c39a-5341-43f2-9e79-2dd282fdaee8	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Admin liked your post	d781e168-0738-43de-b516-66e89f952ea8	t	2026-01-06 14:05:02.09	\N	f	f
4f457d69-9e1d-4f70-ba82-20b1683a6a89	14f0b0ab-1d2c-4181-865f-039fa3012320	post_liked	New Like	Test01 liked your post	d781e168-0738-43de-b516-66e89f952ea8	t	2026-01-06 21:18:12.639	\N	f	f
528cbf51-03d9-41ae-89f0-4c706b05bc83	14f0b0ab-1d2c-4181-865f-039fa3012320	post_commented	New Comment	Test01 commented on your post	d781e168-0738-43de-b516-66e89f952ea8	t	2026-01-06 21:18:23.146	\N	f	f
3239ff6a-2078-4782-a5f6-e22286889cef	a56b1389-3576-4eda-a646-52c96b9884fb	request_rejected	Admin rejected your request	Your skill request has been rejected	e9f5f57f-25f8-450b-ad0e-d2f23efedd21	f	2026-01-08 03:06:49.801	\N	f	f
394e5870-c074-487a-a183-081eed0fb686	a56b1389-3576-4eda-a646-52c96b9884fb	request_accepted	Admin accepted your request	Your skill request has been accepted	8e3041fd-59b8-4964-85fd-edc55a105d73	f	2026-01-08 03:06:53.301	\N	f	f
32e934fb-f819-4639-8a4d-c33a76abf866	14f0b0ab-1d2c-4181-865f-039fa3012320	follow	New Follower	Admin started following you	d3fba700-f891-4cc2-8427-6e2a30fee6cf	f	2026-01-08 18:32:19.743	\N	f	f
ac0d2ab0-1c65-479b-a28e-055486214338	9a8c5aec-2dde-4bee-9ed9-a142382957ae	follow	New Follower	Admin started following you	d3fba700-f891-4cc2-8427-6e2a30fee6cf	f	2026-01-08 18:43:52.937	\N	f	f
83de6950-e46c-478b-9d1b-d879c8a5b83d	d3fba700-f891-4cc2-8427-6e2a30fee6cf	follow	New Follower	kelvin started following you	14f0b0ab-1d2c-4181-865f-039fa3012320	t	2026-01-08 18:53:00.379	\N	f	f
\.


--
-- Data for Name: Post; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Post" (id, "userId", content, "createdAt", "isPinned", "pinnedAt", image, "scheduledAt", "isScheduled") FROM stdin;
5208a69f-442f-4230-999b-a0f34280c016	d3fba700-f891-4cc2-8427-6e2a30fee6cf	Hi, I am an admin	2026-01-12 16:11:24.739	f	\N	https://res.cloudinary.com/dwdyqnkbe/image/upload/v1768234252/xavlink/posts/fze5sgtatavlylsyw1sg.jpg	\N	f
\.


--
-- Data for Name: ProfileView; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."ProfileView" (id, "userId", "viewerId", "viewedAt") FROM stdin;
\.


--
-- Data for Name: Report; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Report" (id, "reporterId", reason, description, "reportedUserId", "reportedPostId", status, "resolvedBy", "resolutionNote", "createdAt", "updatedAt", "reportedMessageId") FROM stdin;
efbcb512-196c-4343-a257-088259955ccb	d3fba700-f891-4cc2-8427-6e2a30fee6cf	spam	hi sjkd kajs ksndx jd	\N	271f335a-eb17-4d01-8022-ae3b0f1a8858	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 13:41:24.64	2026-01-06 13:42:00.634	\N
82279aa3-e04d-4b48-891e-49d1c74e93ba	d3fba700-f891-4cc2-8427-6e2a30fee6cf	harassment	Reported message\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: 60b556de-d3a4-493c-bc99-396800183f8a\nText: j	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 15:54:59.763	2026-01-06 15:55:20.146	60b556de-d3a4-493c-bc99-396800183f8a
f403bdf8-df99-4d00-932d-bd1b09a8e810	d3fba700-f891-4cc2-8427-6e2a30fee6cf	harassment	Reported message\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: 60b556de-d3a4-493c-bc99-396800183f8a\nText: j	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 15:55:35.356	2026-01-06 16:01:36.11	60b556de-d3a4-493c-bc99-396800183f8a
0aed795f-2b9f-4edf-b3f5-0f378f51114d	d3fba700-f891-4cc2-8427-6e2a30fee6cf	harassment	Reported message\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: fdc3c83b-95f4-4606-a586-6286343a8119\nText: h	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 16:11:13.696	2026-01-06 16:11:30.877	fdc3c83b-95f4-4606-a586-6286343a8119
d883018c-9615-4d78-ad5b-26f443fe5074	d3fba700-f891-4cc2-8427-6e2a30fee6cf	spam	knk kmk, k\n\n---\nMessage by: kelvin\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: fdc3c83b-95f4-4606-a586-6286343a8119	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 16:14:07.784	2026-01-06 16:17:37.399	fdc3c83b-95f4-4606-a586-6286343a8119
4cf8d6a3-282e-490e-a6fb-8018fae92cc9	d3fba700-f891-4cc2-8427-6e2a30fee6cf	harassment	kjkjmkl;mkl\n\n---\nMessage by: kelvin\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: e3724db5-6820-40ef-9342-3d524fcb9ff1	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 16:18:21.395	2026-01-06 16:18:35.168	e3724db5-6820-40ef-9342-3d524fcb9ff1
8e839a4e-9058-462d-b3cb-bfd867065a92	d3fba700-f891-4cc2-8427-6e2a30fee6cf	spam	lkmkmmkk;l\n\n---\nMessage by: kelvin\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: e3724db5-6820-40ef-9342-3d524fcb9ff1	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 16:22:04.006	2026-01-06 16:23:13.343	e3724db5-6820-40ef-9342-3d524fcb9ff1
a56388c1-3f33-4e4b-80f9-67340bdbffe1	d3fba700-f891-4cc2-8427-6e2a30fee6cf	spam	jlkjkjklmn\n\n---\nMessage by: kelvin\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: e3724db5-6820-40ef-9342-3d524fcb9ff1	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 16:24:38.607	2026-01-06 16:24:51.686	e3724db5-6820-40ef-9342-3d524fcb9ff1
7f7508b8-1ca0-4f8b-8614-1b6db7cb8cb0	d3fba700-f891-4cc2-8427-6e2a30fee6cf	spam	lknlmlmklm\n\n---\nMessage by: kelvin\nChat ID: 3c2d83c0-32fc-4c21-bf68-c4fea9f99968\nMessage ID: e3724db5-6820-40ef-9342-3d524fcb9ff1	14f0b0ab-1d2c-4181-865f-039fa3012320	\N	resolved	d3fba700-f891-4cc2-8427-6e2a30fee6cf	\N	2026-01-06 16:28:48.884	2026-01-06 16:29:00.674	e3724db5-6820-40ef-9342-3d524fcb9ff1
\.


--
-- Data for Name: Request; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Request" (id, "fromUserId", "toUserId", "skillId", status, "createdAt", "updatedAt", "completedAt", "counterOffer", "counterPrice", deadline, "isUrgent", message, "reminderSentAt") FROM stdin;
00e58726-03b8-4525-9d62-941b52565187	14f0b0ab-1d2c-4181-865f-039fa3012320	d3fba700-f891-4cc2-8427-6e2a30fee6cf	5924185b-989c-4d99-a92c-9531328f602b	rejected	2026-01-06 13:24:05.866	2026-01-06 13:24:18.626	\N	\N	\N	\N	f	\N	\N
8212e0cf-a247-4628-95e6-4db11ac0c466	14f0b0ab-1d2c-4181-865f-039fa3012320	d3fba700-f891-4cc2-8427-6e2a30fee6cf	5924185b-989c-4d99-a92c-9531328f602b	rejected	2026-01-06 13:24:01.108	2026-01-06 13:24:22.352	\N	\N	\N	\N	f	\N	\N
e9f5f57f-25f8-450b-ad0e-d2f23efedd21	a56b1389-3576-4eda-a646-52c96b9884fb	d3fba700-f891-4cc2-8427-6e2a30fee6cf	5924185b-989c-4d99-a92c-9531328f602b	rejected	2026-01-06 21:18:48.314	2026-01-08 03:06:49.797	\N	\N	\N	\N	f	\N	\N
eb1ee610-f526-4baa-abe3-58bbe8207086	d3fba700-f891-4cc2-8427-6e2a30fee6cf	d3fba700-f891-4cc2-8427-6e2a30fee6cf	5924185b-989c-4d99-a92c-9531328f602b	completed	2026-01-06 20:58:14.765	2026-01-11 16:55:51.406	2026-01-11 16:55:51.406	\N	\N	\N	f	\N	\N
8e3041fd-59b8-4964-85fd-edc55a105d73	a56b1389-3576-4eda-a646-52c96b9884fb	d3fba700-f891-4cc2-8427-6e2a30fee6cf	5924185b-989c-4d99-a92c-9531328f602b	completed	2026-01-06 21:18:47.463	2026-01-13 06:23:22.861	2026-01-13 06:23:22.861	\N	\N	\N	f	\N	\N
c4b119c4-4674-4086-a67c-35be937beba6	14f0b0ab-1d2c-4181-865f-039fa3012320	d3fba700-f891-4cc2-8427-6e2a30fee6cf	5924185b-989c-4d99-a92c-9531328f602b	completed	2026-01-06 13:23:55.523	2026-01-13 06:23:31.812	2026-01-13 06:23:31.811	\N	\N	\N	f	\N	\N
\.


--
-- Data for Name: RequestTemplate; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."RequestTemplate" (id, "userId", title, message, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Review" (id, "authorId", "userId", rating, comment, "createdAt", "updatedAt") FROM stdin;
914340d0-4946-4b0b-8953-a0a47e2d37f6	d3fba700-f891-4cc2-8427-6e2a30fee6cf	14f0b0ab-1d2c-4181-865f-039fa3012320	5	h	2026-01-06 03:26:32.676	2026-01-06 03:26:32.676
\.


--
-- Data for Name: Skill; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."Skill" (id, "userId", title, description, category, "priceRange", "createdAt", "updatedAt", proficiency, subcategory) FROM stdin;
5924185b-989c-4d99-a92c-9531328f602b	d3fba700-f891-4cc2-8427-6e2a30fee6cf	frontend	looking for clint 	Web Development	150-250	2026-01-06 13:19:25.94	2026-01-06 13:19:25.94	beginner	\N
8b72fe28-1c48-4fc6-97b9-0f0aa4c78b5d	14f0b0ab-1d2c-4181-865f-039fa3012320	frontend	General skill	general	\N	2026-01-08 19:52:02.004	2026-01-08 19:52:02.004	beginner	\N
261cf2ec-d97a-4169-b7ac-ffc8573c4006	d3fba700-f891-4cc2-8427-6e2a30fee6cf	dd	General skill	general	\N	2026-01-08 19:52:33.77	2026-01-08 19:52:33.77	beginner	\N
cbb0a0f3-368e-4fb1-a09b-de851ea2a730	14f0b0ab-1d2c-4181-865f-039fa3012320	dd	General skill	general	\N	2026-01-08 19:52:57.126	2026-01-08 19:52:57.126	beginner	\N
\.


--
-- Data for Name: SkillCertification; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."SkillCertification" (id, "skillId", name, issuer, "issueDate", "expiryDate", "certificateUrl", "createdAt") FROM stdin;
\.


--
-- Data for Name: SkillEndorsement; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."SkillEndorsement" (id, "skillId", "endorserId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SkillRecommendation; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."SkillRecommendation" (id, "userId", "skillName", reason, score, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."User" (id, name, email, password, course, year, bio, "profilePic", "createdAt", "followersCount", "followingCount", "postsCount", "resetToken", "resetTokenExpiry", "isSuspended", role, "emailVerified", "verificationToken", "verificationTokenExpiry", "suspensionEndsAt", "twoFactorEnabled", "twoFactorSecret", "githubUrl", "lastActiveAt", "linkedInUrl", "portfolioUrl", "profileViews", "linkedInVerified", "githubVerified", "portfolioVerified") FROM stdin;
9a8c5aec-2dde-4bee-9ed9-a142382957ae	Alice Example	alice@example.com	$2b$10$1esRcr3ou87rOS/fHG6Dlu/AvgUPaqAEbXFbEXp8HZNd7ZVey5hSe	Computer Science	3	Early contributor	\N	2026-01-06 13:31:12.225	0	0	0	\N	\N	f	user	t	\N	\N	\N	f	\N	\N	\N	\N	\N	0	f	f	f
ae2f98a5-6ba9-44c1-a469-0e43f67b84a6	test2	kelvinkbk1304@gmail.com	$2b$10$ozlypJrOxWsvaSpp0/.wZOOHeilQubM1Xuhr8QLxDB1pbc5I5HDEO	bba	2		\N	2026-01-13 04:50:55.668	0	0	0	\N	\N	f	user	t	16ab5bc14195c439f4ccc39b9c63f79eb0cc4b072f9b928076a2ada0a4719082	2026-01-14 04:50:55.666	\N	f	\N	\N	\N	\N	\N	0	f	f	f
14f0b0ab-1d2c-4181-865f-039fa3012320	kelvin	Kelvinkbk2006@gmail.com	$2b$10$1gheV1E8cig/UmcTuj4URetNIoq7ZfNUPc.VxGWIylyY.LNFNck0a	computer science	2	h		2026-01-05 18:39:21.814	1	1	0	\N	\N	f	user	t	\N	\N	\N	f	\N	\N	\N	\N	\N	0	f	f	f
d3fba700-f891-4cc2-8427-6e2a30fee6cf	Admin	admin@xavlink.com	$2b$10$2yhSMtowGQ.YXyVug86zJu84uriPC53Itjy/sKXPW14QlL86uUvly	Admin	0	System administrator	https://res.cloudinary.com/dwdyqnkbe/image/upload/v1768286324/xavlink/profile/i0njfm6dcat6kil7t4yp.png	2026-01-05 19:43:30.522	1	1	0	\N	\N	f	admin	t	\N	\N	\N	t	JNYDKWZZIBRC432DGRYEWLBGIFUGCZJTORAHA43IGQXVMVDFINQQ	\N	\N	\N	\N	0	f	f	f
f2f24b1d-995a-4599-92fb-56bd3e8724a2	Test	kelvinkbk@gmail.com	$2b$10$8UoRrP6ACFp1RWFoQD4tauoLkttoCo95dcBq6aei2GZ76DgqH2nx.	Computer science 	2	Energy	\N	2026-01-06 20:16:08.932	0	0	0	\N	\N	f	user	t	fc91ff309c418390c52292a292315176437464dd306dea84a20f50984fdefce8	2026-01-07 20:16:08.931	\N	f	\N	\N	\N	\N	\N	0	f	f	f
a56b1389-3576-4eda-a646-52c96b9884fb	Test01	robinshinu30@gmail.com	$2b$10$xjBtIRQqufTPNP0AlZpqK.QX5II0J.sm2ppiY60Ud0wVUzkusYrTq	Computer Science 	2		\N	2026-01-06 21:17:30.135	0	0	0	\N	\N	f	user	t	c411cdfbf95acd5aebcee336664c4e9d6ccf3dc7d00f7a49d17cf0f5a4399965	2026-01-07 21:17:30.134	\N	f	\N	\N	\N	\N	\N	0	f	f	f
\.


--
-- Data for Name: UserPhoto; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."UserPhoto" (id, "userId", url, caption, "order", "createdAt") FROM stdin;
\.


--
-- Data for Name: UserSettings; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public."UserSettings" (id, "userId", "isPrivateProfile", "allowMessages", "allowRequestsFromAll", "emailNotifications", "pushNotifications", "requestNotifications", "messageNotifications", "activityNotifications", theme, language, "twoFactorEnabled", "lastLoginAt", "updatedAt", "commentNotifications", "followNotifications", "likeNotifications", "quietHoursEnd", "quietHoursStart", "colorPalette") FROM stdin;
f45f5537-eb92-414a-bb6f-04b7cae2c4a0	14f0b0ab-1d2c-4181-865f-039fa3012320	t	everyone	t	t	t	t	t	t	dark	en	f	\N	2026-01-06 13:23:32.271	t	t	t	\N	\N	champagne
5697d88a-18c9-45f5-9765-da8d47c9eeea	a56b1389-3576-4eda-a646-52c96b9884fb	f	everyone	t	t	t	t	t	t	dark	en	f	\N	2026-01-06 21:19:24.139	t	t	t	\N	\N	champagne
f93572e7-df62-4e31-b7ba-987253bd2310	f2f24b1d-995a-4599-92fb-56bd3e8724a2	f	everyone	t	t	t	t	t	t	light	en	f	\N	2026-01-08 18:27:33.647	t	t	t	\N	\N	champagne
48db7989-579f-492a-af2f-8035aa3f6fb0	ae2f98a5-6ba9-44c1-a469-0e43f67b84a6	f	everyone	t	t	t	t	t	t	dark	en	f	\N	2026-01-13 06:09:23.45	t	t	t	\N	\N	crimson
2cfe6a46-9597-48cc-be6a-abd945c4970c	d3fba700-f891-4cc2-8427-6e2a30fee6cf	f	everyone	t	t	t	t	t	t	dark	en	f	\N	2026-01-13 06:27:54.258	t	t	t	\N	\N	royal-purple
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: xavlink_db_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
474b7ddb-8033-4c5a-85ca-8df0a9a3f5c8	34381941a54c3e511737f06a277a4f54ca4004b598a3637bf8f6e301ff737319	2026-01-07 19:07:12.207622+00	20260108000000_add_post_features	\N	\N	2026-01-07 19:07:11.913974+00	1
33e63443-1075-4808-82a1-b879f342735c	d72025435e49b7616eed512fd8ce8a5fea2f0f12c68bcc75f81ef762b79fdff0	2026-01-05 17:40:39.418678+00	20251210174627_init	\N	\N	2026-01-05 17:40:39.121098+00	1
2fcd8e0f-aba2-4b4e-892e-d39ad052afa3	9e0b60f03291213accdfa8563dac09749bf652367272505dd1bfa2c58e33e533	2026-01-05 17:40:40.022829+00	20251225101733_add_temp_suspension	\N	\N	2026-01-05 17:40:40.013579+00	1
a5140ccd-6759-4c7e-8a8e-c44d661dce0f	6baf0790c93335afb62bdeb4aa294f462039c7902626149d5a38b086e87800c8	2026-01-05 17:40:39.531674+00	20251212044743_init	\N	\N	2026-01-05 17:40:39.422806+00	1
7822d7fa-6a3b-40ab-a14d-f40bc1753a08	1c82aa8ad78685894a1f958c6a84b9f62eabdba6b04fd4c52dc7333fbb46d9bb	2026-01-05 17:40:39.601137+00	20251212115632_add_follow_system	\N	\N	2026-01-05 17:40:39.534871+00	1
d583e8e4-0cd8-4589-92ee-49651c0d6cd8	835d3e540c1695f8cc75c8865d6a1aa4abd5ac4c840af641bb7029b5f6c79e1c	2026-01-05 17:40:39.639058+00	20251213051022_add_likes_comments	\N	\N	2026-01-05 17:40:39.605781+00	1
f7082e25-9e1a-4571-af95-3c17e7de50fb	225b99e42cd4227f9cfb6f4f6469521fe260d95384ce93d32c88a0fbdecd4069	2026-01-05 17:40:40.037001+00	20251225102338_add_2fa	\N	\N	2026-01-05 17:40:40.027523+00	1
40d1319a-b547-44cd-9f4e-beac81100ea2	5f4060eb93e33f4ba24b9b8fd530dd3fc9cde43a0659bca2ebd9c4dd0f377ba4	2026-01-05 17:40:39.701111+00	20251213053645_add_user_relations_to_likes_comments	\N	\N	2026-01-05 17:40:39.642531+00	1
c05cff52-0750-4a47-aa03-53f1cdf87889	e204fd7b07b0c5f9d47760bb72b1bee5b3e3217d659996e4225c8ff23583d4d7	2026-01-05 17:40:39.711809+00	20251213060230_add_post_commented_notification	\N	\N	2026-01-05 17:40:39.703883+00	1
0efcd73d-9c70-4f6b-a014-bb2d5d6c4d58	d111ad0e9e30034304f1b434fd93a1813ed2d7edc41a812967117fd00f7a54b7	2026-01-05 17:40:39.722927+00	20251218142316_add_chat_group_fieldscd	\N	\N	2026-01-05 17:40:39.714598+00	1
207562fb-9f98-4ecb-8c7a-83b14ba24915	cb928af9df7ac42e2e43ffd247105faa7e10325ff07a81c4076d7bf206834fd6	2026-01-06 15:51:26.442766+00	20260106212020_add_reported_message_id	\N	\N	2026-01-06 15:51:26.328983+00	1
243af7ee-6697-418f-9c13-d19679fbfd44	d41c5c63d1d905bf2ac2374b1ad2624b92da72176d304db5ce3731601e7b84b7	2026-01-05 17:40:39.73517+00	20251220171022_add_password_reset_fields	\N	\N	2026-01-05 17:40:39.725364+00	1
ca7b1fea-38fe-4b0d-a474-5e4aae72f74e	424d7349f9868b3c95525f7622700624bac7e9e348f1741f26e105f89c320491	2026-01-05 17:40:39.748967+00	20251223061209_add_attachment_url	\N	\N	2026-01-05 17:40:39.73827+00	1
a50c3a4b-f1af-432e-b6f2-59d0bd311a0a	a967a139b792b818e2e95d32361a49440a7b48d85e666e26b577cb71b4152492	\N	20260111162835_add_device_session_and_sync	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260111162835_add_device_session_and_sync\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "image" of relation "Post" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"image\\" of relation \\"Post\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7676), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260111162835_add_device_session_and_sync"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260111162835_add_device_session_and_sync"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:226	2026-01-11 16:42:29.627206+00	2026-01-11 16:32:01.51048+00	0
ee4f5fa2-c41d-4476-8fcc-7fd007d2e69f	00c3c5d53d96bf2fc41801bf51ba874f4d654ba9ee1d286b9a2cb205ab490339	2026-01-05 17:40:39.82952+00	20251223065434_add_review_system	\N	\N	2026-01-05 17:40:39.753426+00	1
4eb2a5e8-f780-475a-8468-6f2f1b28f955	8a980f56aba7cd2f577d6618adce65f8ce18f78c1cff582ab93487cd4d3428e0	2026-01-06 17:32:22.291745+00	20260106225646_add_reactions_pins_read_receipts	\N	\N	2026-01-06 17:32:22.19255+00	1
99dfdbe1-1d3b-4cfe-bde9-37972c44fd8a	67fa81d0edb5264dc879d3a72b1d2baa26cc5415089734680cce58ec4fd8ef0b	2026-01-05 17:40:39.851734+00	20251224115759_add_user_roles	\N	\N	2026-01-05 17:40:39.833008+00	1
6f11ac32-e5d0-4c33-be29-cce9a558be72	67473718eae016bf50ac976ad4f9761619894e9535b30f9c85800d9f626e9314	2026-01-05 17:40:39.942494+00	20251224125134_add_reports_and_audit	\N	\N	2026-01-05 17:40:39.855842+00	1
9e928ea5-8127-4c29-aeaf-baeec22281b3	38076619a8e70e508f8091b8e83096105f1195bf76ebcc4d9c9eda635db51b74	2026-01-13 17:28:45.246727+00	20260109_add_social_verification	\N	\N	2026-01-13 17:28:45.227395+00	1
f3a508ca-1b01-4435-b1e7-7aecd756ccb7	707b6b6841e446c6b6fc6171c1251694485ebf49f36b7925d5ab832c84587af3	2026-01-05 17:40:40.009127+00	20251225072316_add_email_verification	\N	\N	2026-01-05 17:40:39.945301+00	1
02a8f38b-4a71-45e3-85af-c3906b856596	64471b71ba2c853e78cfb91ecb48a2c9531db3a77d3d9fa31ba96b7be8a70993	2026-01-06 18:44:49.923097+00	20260107000100_add_unread_counts	\N	\N	2026-01-06 18:44:49.908242+00	1
a5f15feb-5da9-430c-8b22-d895f961b0f6	b934cb82edef4e14f637e4c476671fb4a19c2c42ea83488b851ced0dac0b3d5c	2026-01-11 16:42:32.023232+00	20260111162835_add_device_session_and_sync	\N	\N	2026-01-11 16:42:31.421688+00	1
7c31c158-5f00-46e0-b7c8-f93c0ac2dbbb	3c7a074c467b7f22bd39e1e2224d9377634ee4fa5d32a0d9eeae4ecb0caf7199	2026-01-07 17:16:07.726825+00	20260107001500_add_edited_field	\N	\N	2026-01-07 17:16:07.705386+00	1
8c0046e7-794e-4671-a144-7f0f86d7a276	cb6d142d22054874047c55aa6774cb7ddf01e715ef0be1f83344d229b9435386	2026-01-07 17:52:07.823728+00	20260107003000_add_blocked_users	\N	\N	2026-01-07 17:52:07.809504+00	1
649d3c35-4b23-4059-82c6-5f8b536409af	c6dd10f505d350d38645b2063b28083ebac6ee4491618415b1f85ad697d617a7	2026-01-07 18:33:27.51057+00	20260107010000_add_bookmarks_and_reactions	\N	\N	2026-01-07 18:33:27.424295+00	1
d3a737c5-cc60-4e9f-8794-253698f9e538	612b828f0e17753896ed050d8561201eeb69c5af9b78c770086305871b44597d	2026-01-13 06:06:44.323563+00	20260113060549_add_color_palette	\N	\N	2026-01-13 06:06:44.31247+00	1
18323568-bb4f-4120-87db-8db2f560921b	9671dc6a62fce793a48b5026983058c0b50d69c522fb97048440d0778fee2c1d	2026-01-13 17:28:45.341874+00	20260113_add_low_priority_features	\N	\N	2026-01-13 17:28:45.249942+00	1
\.


--
-- Name: Achievement Achievement_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Achievement"
    ADD CONSTRAINT "Achievement_pkey" PRIMARY KEY (id);


--
-- Name: Activity Activity_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BlockedUser BlockedUser_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."BlockedUser"
    ADD CONSTRAINT "BlockedUser_pkey" PRIMARY KEY (id);


--
-- Name: Bookmark Bookmark_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_pkey" PRIMARY KEY (id);


--
-- Name: ChatParticipant ChatParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY (id);


--
-- Name: Chat Chat_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_pkey" PRIMARY KEY (id);


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: DeviceSession DeviceSession_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."DeviceSession"
    ADD CONSTRAINT "DeviceSession_pkey" PRIMARY KEY (id);


--
-- Name: Favorite Favorite_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_pkey" PRIMARY KEY (id);


--
-- Name: Follow Follow_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_pkey" PRIMARY KEY (id);


--
-- Name: Like Like_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_pkey" PRIMARY KEY (id);


--
-- Name: MessageReaction MessageReaction_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."MessageReaction"
    ADD CONSTRAINT "MessageReaction_pkey" PRIMARY KEY (id);


--
-- Name: MessageRead MessageRead_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."MessageRead"
    ADD CONSTRAINT "MessageRead_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: ModNote ModNote_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ModNote"
    ADD CONSTRAINT "ModNote_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- Name: ProfileView ProfileView_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ProfileView"
    ADD CONSTRAINT "ProfileView_pkey" PRIMARY KEY (id);


--
-- Name: Report Report_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_pkey" PRIMARY KEY (id);


--
-- Name: RequestTemplate RequestTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."RequestTemplate"
    ADD CONSTRAINT "RequestTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Request Request_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: SkillCertification SkillCertification_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillCertification"
    ADD CONSTRAINT "SkillCertification_pkey" PRIMARY KEY (id);


--
-- Name: SkillEndorsement SkillEndorsement_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillEndorsement"
    ADD CONSTRAINT "SkillEndorsement_pkey" PRIMARY KEY (id);


--
-- Name: SkillRecommendation SkillRecommendation_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillRecommendation"
    ADD CONSTRAINT "SkillRecommendation_pkey" PRIMARY KEY (id);


--
-- Name: SkillRecommendation SkillRecommendation_userId_skillName_key; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillRecommendation"
    ADD CONSTRAINT "SkillRecommendation_userId_skillName_key" UNIQUE ("userId", "skillName");


--
-- Name: Skill Skill_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Skill"
    ADD CONSTRAINT "Skill_pkey" PRIMARY KEY (id);


--
-- Name: UserPhoto UserPhoto_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."UserPhoto"
    ADD CONSTRAINT "UserPhoto_pkey" PRIMARY KEY (id);


--
-- Name: UserSettings UserSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Achievement_type_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Achievement_type_idx" ON public."Achievement" USING btree (type);


--
-- Name: Achievement_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Achievement_userId_idx" ON public."Achievement" USING btree ("userId");


--
-- Name: Achievement_userId_type_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "Achievement_userId_type_key" ON public."Achievement" USING btree ("userId", type);


--
-- Name: Activity_createdAt_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Activity_createdAt_idx" ON public."Activity" USING btree ("createdAt");


--
-- Name: Activity_type_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Activity_type_idx" ON public."Activity" USING btree (type);


--
-- Name: Activity_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Activity_userId_idx" ON public."Activity" USING btree ("userId");


--
-- Name: AuditLog_action_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "AuditLog_action_idx" ON public."AuditLog" USING btree (action);


--
-- Name: AuditLog_actorId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "AuditLog_actorId_idx" ON public."AuditLog" USING btree ("actorId");


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: BlockedUser_blockedId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "BlockedUser_blockedId_idx" ON public."BlockedUser" USING btree ("blockedId");


--
-- Name: BlockedUser_blockerId_blockedId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "BlockedUser_blockerId_blockedId_key" ON public."BlockedUser" USING btree ("blockerId", "blockedId");


--
-- Name: BlockedUser_blockerId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "BlockedUser_blockerId_idx" ON public."BlockedUser" USING btree ("blockerId");


--
-- Name: Bookmark_postId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Bookmark_postId_idx" ON public."Bookmark" USING btree ("postId");


--
-- Name: Bookmark_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Bookmark_userId_idx" ON public."Bookmark" USING btree ("userId");


--
-- Name: Bookmark_userId_postId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "Bookmark_userId_postId_key" ON public."Bookmark" USING btree ("userId", "postId");


--
-- Name: ChatParticipant_chatId_userId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "ChatParticipant_chatId_userId_key" ON public."ChatParticipant" USING btree ("chatId", "userId");


--
-- Name: Comment_postId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Comment_postId_idx" ON public."Comment" USING btree ("postId");


--
-- Name: Comment_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Comment_userId_idx" ON public."Comment" USING btree ("userId");


--
-- Name: DeviceSession_deviceId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "DeviceSession_deviceId_idx" ON public."DeviceSession" USING btree ("deviceId");


--
-- Name: DeviceSession_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "DeviceSession_userId_idx" ON public."DeviceSession" USING btree ("userId");


--
-- Name: Favorite_favoriteUserId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Favorite_favoriteUserId_idx" ON public."Favorite" USING btree ("favoriteUserId");


--
-- Name: Favorite_userId_favoriteUserId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "Favorite_userId_favoriteUserId_key" ON public."Favorite" USING btree ("userId", "favoriteUserId");


--
-- Name: Favorite_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Favorite_userId_idx" ON public."Favorite" USING btree ("userId");


--
-- Name: Follow_followerId_followingId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON public."Follow" USING btree ("followerId", "followingId");


--
-- Name: Follow_followerId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Follow_followerId_idx" ON public."Follow" USING btree ("followerId");


--
-- Name: Follow_followingId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Follow_followingId_idx" ON public."Follow" USING btree ("followingId");


--
-- Name: Like_postId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Like_postId_idx" ON public."Like" USING btree ("postId");


--
-- Name: Like_postId_userId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "Like_postId_userId_key" ON public."Like" USING btree ("postId", "userId");


--
-- Name: Like_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Like_userId_idx" ON public."Like" USING btree ("userId");


--
-- Name: MessageReaction_messageId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "MessageReaction_messageId_idx" ON public."MessageReaction" USING btree ("messageId");


--
-- Name: MessageReaction_messageId_userId_emoji_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_emoji_key" ON public."MessageReaction" USING btree ("messageId", "userId", emoji);


--
-- Name: MessageRead_messageId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "MessageRead_messageId_idx" ON public."MessageRead" USING btree ("messageId");


--
-- Name: MessageRead_messageId_userId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON public."MessageRead" USING btree ("messageId", "userId");


--
-- Name: MessageRead_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "MessageRead_userId_idx" ON public."MessageRead" USING btree ("userId");


--
-- Name: Message_chatId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Message_chatId_idx" ON public."Message" USING btree ("chatId");


--
-- Name: Message_isPinned_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Message_isPinned_idx" ON public."Message" USING btree ("isPinned");


--
-- Name: Message_senderId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Message_senderId_idx" ON public."Message" USING btree ("senderId");


--
-- Name: ModNote_moderatorId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "ModNote_moderatorId_idx" ON public."ModNote" USING btree ("moderatorId");


--
-- Name: ModNote_reportId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "ModNote_reportId_idx" ON public."ModNote" USING btree ("reportId");


--
-- Name: Notification_archived_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Notification_archived_idx" ON public."Notification" USING btree (archived);


--
-- Name: Notification_createdAt_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Notification_createdAt_idx" ON public."Notification" USING btree ("createdAt");


--
-- Name: Notification_isPinned_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Notification_isPinned_idx" ON public."Notification" USING btree ("isPinned");


--
-- Name: Notification_read_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Notification_read_idx" ON public."Notification" USING btree (read);


--
-- Name: Notification_type_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Notification_type_idx" ON public."Notification" USING btree (type);


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: Post_isPinned_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Post_isPinned_idx" ON public."Post" USING btree ("isPinned");


--
-- Name: Post_isScheduled_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Post_isScheduled_idx" ON public."Post" USING btree ("isScheduled");


--
-- Name: Post_scheduledAt_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Post_scheduledAt_idx" ON public."Post" USING btree ("scheduledAt");


--
-- Name: Post_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Post_userId_idx" ON public."Post" USING btree ("userId");


--
-- Name: ProfileView_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "ProfileView_userId_idx" ON public."ProfileView" USING btree ("userId");


--
-- Name: ProfileView_viewedAt_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "ProfileView_viewedAt_idx" ON public."ProfileView" USING btree ("viewedAt");


--
-- Name: ProfileView_viewerId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "ProfileView_viewerId_idx" ON public."ProfileView" USING btree ("viewerId");


--
-- Name: Report_createdAt_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Report_createdAt_idx" ON public."Report" USING btree ("createdAt");


--
-- Name: Report_reportedMessageId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Report_reportedMessageId_idx" ON public."Report" USING btree ("reportedMessageId");


--
-- Name: Report_reportedPostId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Report_reportedPostId_idx" ON public."Report" USING btree ("reportedPostId");


--
-- Name: Report_reportedUserId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Report_reportedUserId_idx" ON public."Report" USING btree ("reportedUserId");


--
-- Name: Report_reporterId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Report_reporterId_idx" ON public."Report" USING btree ("reporterId");


--
-- Name: Report_status_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Report_status_idx" ON public."Report" USING btree (status);


--
-- Name: RequestTemplate_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "RequestTemplate_userId_idx" ON public."RequestTemplate" USING btree ("userId");


--
-- Name: Request_deadline_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Request_deadline_idx" ON public."Request" USING btree (deadline);


--
-- Name: Request_isUrgent_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Request_isUrgent_idx" ON public."Request" USING btree ("isUrgent");


--
-- Name: Request_toUserId_status_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Request_toUserId_status_idx" ON public."Request" USING btree ("toUserId", status);


--
-- Name: Review_authorId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Review_authorId_idx" ON public."Review" USING btree ("authorId");


--
-- Name: Review_authorId_userId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "Review_authorId_userId_key" ON public."Review" USING btree ("authorId", "userId");


--
-- Name: Review_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Review_userId_idx" ON public."Review" USING btree ("userId");


--
-- Name: SkillCertification_skillId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "SkillCertification_skillId_idx" ON public."SkillCertification" USING btree ("skillId");


--
-- Name: SkillEndorsement_endorserId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "SkillEndorsement_endorserId_idx" ON public."SkillEndorsement" USING btree ("endorserId");


--
-- Name: SkillEndorsement_skillId_endorserId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "SkillEndorsement_skillId_endorserId_key" ON public."SkillEndorsement" USING btree ("skillId", "endorserId");


--
-- Name: SkillEndorsement_skillId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "SkillEndorsement_skillId_idx" ON public."SkillEndorsement" USING btree ("skillId");


--
-- Name: SkillRecommendation_score_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "SkillRecommendation_score_idx" ON public."SkillRecommendation" USING btree (score);


--
-- Name: SkillRecommendation_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "SkillRecommendation_userId_idx" ON public."SkillRecommendation" USING btree ("userId");


--
-- Name: Skill_category_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Skill_category_idx" ON public."Skill" USING btree (category);


--
-- Name: Skill_proficiency_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Skill_proficiency_idx" ON public."Skill" USING btree (proficiency);


--
-- Name: Skill_title_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "Skill_title_idx" ON public."Skill" USING btree (title);


--
-- Name: UserPhoto_order_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "UserPhoto_order_idx" ON public."UserPhoto" USING btree ("order");


--
-- Name: UserPhoto_userId_idx; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE INDEX "UserPhoto_userId_idx" ON public."UserPhoto" USING btree ("userId");


--
-- Name: UserSettings_userId_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "UserSettings_userId_key" ON public."UserSettings" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: xavlink_db_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Achievement Achievement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Achievement"
    ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Activity Activity_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON DELETE SET NULL;


--
-- Name: Activity Activity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Bookmark Bookmark_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Bookmark"
    ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatParticipant ChatParticipant_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatParticipant ChatParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DeviceSession DeviceSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."DeviceSession"
    ADD CONSTRAINT "DeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_favoriteUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_favoriteUserId_fkey" FOREIGN KEY ("favoriteUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follow Follow_followerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Follow Follow_followingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Follow"
    ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageReaction MessageReaction_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."MessageReaction"
    ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MessageRead MessageRead_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."MessageRead"
    ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."Message"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ModNote ModNote_moderatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ModNote"
    ADD CONSTRAINT "ModNote_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ModNote ModNote_reportId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ModNote"
    ADD CONSTRAINT "ModNote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES public."Report"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Post Post_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProfileView ProfileView_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."ProfileView"
    ADD CONSTRAINT "ProfileView_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Report Report_reportedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Report Report_reporterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Report Report_resolvedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Report"
    ADD CONSTRAINT "Report_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Request Request_fromUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Request Request_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Request Request_toUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Request"
    ADD CONSTRAINT "Request_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Review Review_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Review Review_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SkillCertification SkillCertification_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillCertification"
    ADD CONSTRAINT "SkillCertification_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SkillEndorsement SkillEndorsement_endorserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillEndorsement"
    ADD CONSTRAINT "SkillEndorsement_endorserId_fkey" FOREIGN KEY ("endorserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SkillEndorsement SkillEndorsement_skillId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillEndorsement"
    ADD CONSTRAINT "SkillEndorsement_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES public."Skill"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SkillRecommendation SkillRecommendation_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."SkillRecommendation"
    ADD CONSTRAINT "SkillRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: Skill Skill_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."Skill"
    ADD CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserPhoto UserPhoto_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."UserPhoto"
    ADD CONSTRAINT "UserPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserSettings UserSettings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: xavlink_db_user
--

ALTER TABLE ONLY public."UserSettings"
    ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES TO xavlink_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES TO xavlink_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS TO xavlink_db_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES TO xavlink_db_user;


--
-- PostgreSQL database dump complete
--

\unrestrict PEVvSlpWcsQCTGsQFMy1n9EHiUyfpadRlQLdSmu6c8SFziHWMsRKNlVzh2m2pBl

