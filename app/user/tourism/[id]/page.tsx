import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import DetailContent from "./DetailContent";

export default async function PlaceDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    // Check if it's a mock ID
    // if (id.startsWith('mock-')) {
    //     const mockSpots = [
    //         {
    //             id: 'mock-1',
    //             name: "Umbrella Rocks",
    //             address: "Sabangan, Mapandan, Pangasinan",
    //             imageUrl: "/place_to_visits/umbrella_rocks.png",
    //             description: "Mapandan's most iconic landmark, famed for mushroom-shaped rock formations sculpted by the relentless waves of the West Philippine Sea. It resembles a giant half-opened umbrella, attracting tourists and geologists alike.",
    //             category: "Geological Formation",
    //             entranceFee: "₱20.00",
    //             bestTimeToVisit: "Summer (March to May)",
    //             googleMapsUrl: "https://maps.app.goo.gl/Fkiw8PHYzdNVXEHA9",
    //             latitude: 16.114229,
    //             longitude: 119.796543,
    //         },
    //         {
    //             id: 'mock-2',
    //             name: "Sabangan Beach",
    //             address: "Sabangan, Mapandan, Pangasinan",
    //             imageUrl: "/place_to_visits/sabangan_beach.png",
    //             description: "Boasting crystal-clear turquoise waters and a diverse marine ecosystem, ideal for swimming and snorkeling. The shoreline is perfect for families looking for a relaxing day by the sea.",
    //             category: "Beach",
    //             entranceFee: "Free",
    //             bestTimeToVisit: "Morning / Daytime",
    //             latitude: 16.115,
    //             longitude: 119.795,
    //         },
    //         {
    //             id: 'mock-3',
    //             name: "Abagatanen Beach",
    //             address: "Abagatanen, Mapandan, Pangasinan",
    //             imageUrl: "/place_to_visits/abagatanen_beach.png",
    //             description: "A serene beach with golden-grey sand and calm blue waters, perfect for a peaceful camping getaway. It's less crowded than other beaches, offering more privacy.",
    //             category: "Beach",
    //             entranceFee: "₱50.00 (Environmental Fee)",
    //             bestTimeToVisit: "Camping Season",
    //             latitude: 16.083,
    //             longitude: 119.783,
    //         },
    //         {
    //             id: 'mock-4',
    //             name: "Death Pool",
    //             address: "Sabangan, Mapandan, Pangasinan",
    //             imageUrl: "/place_to_visits/death_pool.png",
    //             description: "A natural rock formation filled with sea water, creating an 'infinity pool' effect right beside the ocean waves. Despite its name, it's a popular spot for thrill-seekers when the tide is high.",
    //             category: "Natural Pool",
    //             entranceFee: "Included in Umbrella Rocks",
    //             bestTimeToVisit: "High Tide",
    //             latitude: 16.116,
    //             longitude: 119.797,
    //         },
    //         {
    //             id: 'mock-5',
    //             name: "Payad Beach",
    //             address: "Payad, Mapandan, Pangasinan",
    //             imageUrl: "/place_to_visits/payad_beach.png",
    //             description: "A tranquil and rustic beach destination with fine sand and coconut trees, away from the usual crowds. It offers a authentic provincial beach experience.",
    //             category: "Beach",
    //             entranceFee: "Free",
    //             bestTimeToVisit: "Sunset",
    //             latitude: 16.101,
    //             longitude: 119.790,
    //         }
    //     ];
    //     const spot = mockSpots.find(s => s.id === id);
    //     if (!spot) notFound();
    //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     return <DetailContent item={spot as any} />;
    // }

    const item = await prisma.tourismSpot.findUnique({
        where: { id }
    });

    if (!item || !item.isPublished) {
        notFound();
    }

    return <DetailContent item={item} />;
}
