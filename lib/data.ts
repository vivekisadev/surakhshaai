import type { Event, Location, BoundingBoxData } from "@/types";

export const locations: Location[] = [
	{
		id: "emergency-ward",
		name: "Emergency Ward",
		cameras: [
			{
				id: "er-cam-1",
				name: "ER-Triage-01",
				location: "Emergency Ward",
				address: "Emergency Department, Triage Zone A, Ground Floor",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Shoplifting0.mp4",
			},
			{
				id: "er-cam-2",
				name: "ER-Triage-02",
				address: "Emergency Department, Waiting Area, Ground Floor",
				location: "Emergency Ward",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Shoplifting1.mp4",
			},
			{
				id: "er-cam-3",
				name: "ER-Triage-03",
				address: "Emergency Department, Trauma Bay, Ground Floor",
				location: "Emergency Ward",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Shoplifting2.mp4",
			},
		],
	},
	{
		id: "general-ward",
		name: "General Ward",
		cameras: [
			{
				id: "ward-cam-1",
				name: "Ward-B-Corridor",
				address:
					"General Ward, Block B, Corridor 3, First Floor",
				location: "General Ward",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Fighting0.mp4",
			},
			{
				id: "ward-cam-2",
				name: "Ward-B-Nursing",
				address: "General Ward, Nursing Station, Block B",
				location: "General Ward",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Fighting1.mp4",
			},
			{
				id: "ward-cam-3",
				name: "Ward-C-Patient",
				address: "General Ward, Patient Room Zone C, Second Floor",
				location: "General Ward",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Fighting2.mp4",
			},
			{
				id: "ward-cam-4",
				name: "Ward-A-Entry",
				address: "General Ward, Entry Gate, Block A",
				location: "General Ward",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Fighting3.mp4",
			},
		],
	},
	{
		id: "pharmacy",
		name: "Pharmacy",
		cameras: [
			{
				id: "pharma-cam-1",
				name: "Pharmacy-Main",
				address: "Hospital Pharmacy, Dispensary Counter, Ground Floor",
				location: "Pharmacy",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Robbery1.mp4",
			},
			{
				id: "pharma-cam-2",
				name: "Pharmacy-Storage",
				address: "Hospital Pharmacy, Drug Storage Room, Ground Floor",
				location: "Pharmacy",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Robbery2.mp4",
			},
			{
				id: "pharma-cam-3",
				name: "Pharmacy-Restricted",
				address: "Hospital Pharmacy, Controlled Substances Vault",
				location: "Pharmacy",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Robbery3.mp4",
			},
		],
	},
	{
		id: "icu",
		name: "ICU",
		cameras: [
			{
				id: "icu-cam-1",
				name: "ICU-Zone-A",
				address: "Intensive Care Unit, Zone A, Third Floor",
				location: "ICU",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Stealing1.mp4",
			},
		],
	},
	{
		id: "main-entrance",
		name: "Main Entrance",
		cameras: [
			{
				id: "main-cam-1",
				name: "Gate-Main",
				address: "Hospital Main Entrance, Security Gate",
				location: "Main Entrance",
				thumbnail: "/placeholder.svg?height=480&width=640",
				videoUrl: "/videos/Vandalism3.mp4",
			},
		],
	},
];

export const analyzedEvents = [
  {
    videoId: "Ward-B-Corridor",
    timeline: [
      {
        time: "00:02",
        event: "Visitor becomes verbally aggressive towards nurse on duty",
      },
      { 
        time: "00:25", 
        event: "Visitor physically confronts doctor arriving at ward" 
      },
      { 
        time: "00:46", 
        event: "Security personnel alerted — intervention required" 
      },
    ],
    crimeType: ["Patient Aggression", "Assault on Staff"],
    location: "General Ward, Block B, Corridor 3",
  },
  {
    videoId: "Ward-B-Nursing",
    timeline: [
      { 
        time: "00:39", 
        event: "Nurse found sleeping at station during active shift" 
      },
      { 
        time: "00:57", 
        event: "Patient call light ignored for over 10 minutes" 
      },
    ],
    crimeType: ["Staff Negligence", "Duty Abandonment"],
    location: "General Ward, Nursing Station, Block B",
  },
  {
    videoId: "Ward-C-Patient",
    timeline: [
      { 
        time: "00:33", 
        event: "Patient attempts to get out of bed unassisted — fall imminent" 
      },
      { 
        time: "00:34", 
        event: "Patient fall detected — no staff present at time of incident" 
      },
    ],
    crimeType: ["Patient Fall", "Unattended Critical Patient"],
    location: "General Ward, Patient Room Zone C",
  },
  {
    videoId: "ER-Triage-01",
    timeline: [
      {
        time: "00:15",
        event: "Unregistered individual enters triage with concealed object",
      },
      {
        time: "00:45",
        event: "Suspect attempts to access restricted medication cabinet",
      },
    ],
    crimeType: ["Unauthorized Access", "Drug Theft Attempt"],
    location: "Emergency Department, Triage Zone A",
  },
  {
    videoId: "ER-Triage-02",
    timeline: [
      {
        time: "00:10",
        event: "Large crowd gathering around reception — overcrowding risk",
      },
      {
        time: "00:30",
        event: "Altercation breaks out between patient family members and staff",
      },
      {
        time: "00:50",
        event: "Hospital staff cornered — emergency security response needed",
      },
    ],
    crimeType: ["Staff Assault", "Mob Aggression"],
    location: "Emergency Department, Waiting Area",
  },
  {
    videoId: "Pharmacy-Main",
    timeline: [
      {
        time: "00:20",
        event: "Unauthorized person enters pharmacy during off-hours",
      },
      {
        time: "00:40",
        event: "Controlled substances accessed without authorization",
      },
      {
        time: "01:00",
        event: "Individual exits with pharmacy supplies — security breach confirmed",
      },
    ],
    crimeType: ["Drug Theft", "Unauthorized Zone Access"],
    location: "Hospital Pharmacy, Dispensary Counter",
  }
];

function parseTimeToSeconds(timeStr: string): number {
  const [minutes, seconds] = timeStr.split(':').map(Number)
  return minutes * 60 + seconds
}

function convertAnalyzedEventsToEvents(): Event[] {
  return analyzedEvents.flatMap((analyzed, analysisIndex) => {
    const camera = locations
      .flatMap(loc => loc.cameras)
      .find(cam => cam.name === analyzed.videoId)

    if (!camera) return []

    return analyzed.timeline.map((item, index) => ({
      id: `${analyzed.videoId}-${index}`,
      type: analyzed.crimeType[0],
      description: item.event,
      timestamp: new Date(parseTimeToSeconds(item.time) * 1000), // Convert to milliseconds
      camera: camera,
      thumbnail: camera.thumbnail,
    }))
  })
}

export const events = convertAnalyzedEventsToEvents()

export interface Stats {
  totalCameras: number;
  onlineCameras: number;
}

export function getSystemStats(): Stats {
  return {
    totalCameras: 14,
    onlineCameras: 14
  };
}

function generateMockEvent(): Event {
	const cameras = locations.flatMap((location) => location.cameras);
	const types = [
		"Motion Detected",
		"PIR Alarm",
		"Object Removed",
		"Person Detected",
	];

	return {
		id: Math.random().toString(36).substring(7),
		camera: cameras[Math.floor(Math.random() * cameras.length)],
		type: types[Math.floor(Math.random() * types.length)],
		timestamp: new Date(),
		thumbnail: "/placeholder.svg?height=120&width=160",
	};
}

export const initialEvents: Event[] = Array.from({ length: 15 }, (_, i) => ({
	id: i.toString(),
	camera: {
		id: "er-cam-1",
		name: "ER-Triage-01",
		location: "Emergency Ward",
		address: "Emergency Department, Triage Zone A, Ground Floor",
		thumbnail: "/placeholder.svg",
	},
	type: ["Patient Aggression", "Staff Negligence", "Unauthorized Access", "Patient Fall", "Drug Theft", "Zone Breach", "Duty Abandonment"][
		Math.floor(Math.random() * 7)
	],
	timestamp: new Date(Date.now() - Math.random() * 10 * 60 * 1000),
	description: "Hospital security incident detected",
}));

// Maps hospital camera names → bounding box file base-name
// Derived from camera.videoUrl (strip /videos/ prefix and .mp4 extension)
const CAMERA_BOX_MAP: Record<string, string> = {
  // Emergency Ward
  "ER-Triage-01":    "Shoplifting0",
  "ER-Triage-02":    "Shoplifting1",
  "ER-Triage-03":    "Shoplifting2",
  // General Ward
  "Ward-B-Corridor": "Fighting0",
  "Ward-B-Nursing":  "Fighting1",
  "Ward-C-Patient":  "Fighting2",
  "Ward-A-Entry":    "Fighting3",
  // Pharmacy
  "Pharmacy-Main":      "Robbery1",
  "Pharmacy-Storage":   "Robbery2",
  "Pharmacy-Restricted":"Robbery3",
  // ICU
  "ICU-Zone-A":   "Stealing1",
  // Main Entrance
  "Gate-Main":    "Vandalism3",
}

export async function getBoundingBoxData(videoName: string): Promise<BoundingBoxData | null> {
  // Resolve the actual bounding-box file name from the hospital camera name
  const boxName = CAMERA_BOX_MAP[videoName] ?? videoName

  try {
    const response = await fetch(`/bounding_boxes/${boxName}_boxes.json`)
    if (!response.ok) {
      // Silently return null — not all cameras have box data, this is expected
      return null
    }
    return await response.json()
  } catch {
    // Network/parse error — silently ignore
    return null
  }
}
