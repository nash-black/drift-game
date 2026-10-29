#include "raylib.h"

#include <algorithm>
#include <array>
#include <cmath>
#include <string>

namespace {

constexpr int kRacerCount = 6;
constexpr float kRaceLength = 2600.0F;
constexpr float kViewDistance = 180.0F;
constexpr float kPi = 3.14159265358979323846F;

struct CarSpec {
    const char* name;
    const char* className;
    const char* description;
    Color color;
    float topSpeed;
    float acceleration;
    float handling;
    float nitro;
};

constexpr std::array<CarSpec, 4> kCars{{
    {"VOLT XR", "BALANCED / SPORT", "A precise all-rounder built for tight corners.",
     {56, 217, 255, 255}, 228.0F, 92.0F, 1.18F, 1.0F},
    {"NOVA GT", "HIGH SPEED / COUPE", "Long straightaways are where this coupe shines.",
     {255, 91, 112, 255}, 252.0F, 78.0F, 0.94F, 0.92F},
    {"APEX R", "AGILITY / RALLY", "Quick steering and punchy launches off the line.",
     {255, 194, 75, 255}, 216.0F, 108.0F, 1.42F, 1.06F},
    {"TITAN S", "POWER / MUSCLE", "Heavy, stable, and hard to push off your line.",
     {163, 126, 255, 255}, 240.0F, 86.0F, 1.02F, 1.12F},
}};

enum class Screen {
    Lobby,
    Racing,
    Results
};

struct Racer {
    std::string name;
    Color color{};
    float distance = 0.0F;
    float speed = 0.0F;
    float lane = 0.0F;
    float targetLane = 0.0F;
    float skill = 0.0F;
    float laneTimer = 0.0F;
    float finishTime = 0.0F;
    bool player = false;
    bool finished = false;
};

struct Game {
    Screen screen = Screen::Lobby;
    int selectedCar = 0;
    int playerPosition = 1;
    float raceTime = 0.0F;
    float nitro = 100.0F;
    float driftScore = 0.0F;
    float collisionCooldown = 0.0F;
    float finishFlash = 0.0F;
    bool paused = false;
    std::array<Racer, kRacerCount> racers{};
};

constexpr Color kInk{8, 12, 20, 255};
constexpr Color kPanel{13, 21, 33, 240};
constexpr Color kMuted{138, 157, 177, 255};
constexpr Color kWhite{241, 247, 252, 255};
constexpr Color kCyan{68, 229, 255, 255};
constexpr Color kGreen{126, 245, 180, 255};
constexpr Color kOrange{255, 175, 89, 255};

float Clamp01(float value) {
    return std::clamp(value, 0.0F, 1.0F);
}

float RoadCurve(float distance) {
    return 0.18F * std::sin(distance * 0.0037F) +
           0.10F * std::sin(distance * 0.00155F + 1.3F);
}

float RoadY(float ahead, float horizon, float height) {
    const float t = Clamp01(ahead / kViewDistance);
    return horizon + (1.0F - std::pow(t, 1.58F)) * (height - horizon);
}

float RoadWidth(float ahead, float screenWidth) {
    const float t = Clamp01(ahead / kViewDistance);
    return screenWidth * (0.78F - 0.67F * t);
}

float RoadCenter(float worldDistance, float playerDistance, float screenWidth) {
    return screenWidth * 0.5F +
           (RoadCurve(worldDistance) - RoadCurve(playerDistance)) * screenWidth * 0.82F;
}

void DrawCentered(const char* text, int y, int fontSize, Color color) {
    DrawText(text, GetScreenWidth() / 2 - MeasureText(text, fontSize) / 2, y, fontSize, color);
}

bool Button(Rectangle bounds, const char* label, Color accent, int fontSize = 18) {
    const Vector2 mouse = GetMousePosition();
    const bool hovered = CheckCollisionPointRec(mouse, bounds);
    DrawRectangleRec(bounds, hovered ? Color{accent.r, accent.g, accent.b, 38} : kPanel);
    DrawRectangleLinesEx(bounds, hovered ? 2.0F : 1.0F,
                         hovered ? accent : Color{76, 96, 116, 255});
    DrawText(label,
             static_cast<int>(bounds.x + bounds.width * 0.5F -
                              MeasureText(label, fontSize) * 0.5F),
             static_cast<int>(bounds.y + bounds.height * 0.5F - fontSize * 0.5F),
             fontSize, hovered ? kWhite : accent);
    return hovered && IsMouseButtonPressed(MOUSE_BUTTON_LEFT);
}

void DrawBackground(int width, int height) {
    DrawRectangleGradientV(0, 0, width, height, Color{24, 44, 65, 255}, Color{8, 13, 22, 255});
    DrawCircle(width / 2, static_cast<int>(height * 0.26F), height * 0.105F,
               Color{255, 188, 120, 45});
    DrawCircle(width / 2, static_cast<int>(height * 0.26F), height * 0.068F,
               Color{255, 210, 151, 110});

    const float horizon = height * 0.38F;
    for (int i = 0; i < 30; ++i) {
        const float x = static_cast<float>((i * 193) % std::max(width, 1));
        const float buildingWidth = 18.0F + static_cast<float>((i * 17) % 46);
        const float buildingHeight = 24.0F + static_cast<float>((i * 43) % 114);
        DrawRectangle(static_cast<int>(x), static_cast<int>(horizon - buildingHeight),
                      static_cast<int>(buildingWidth), static_cast<int>(buildingHeight),
                      Color{12, 22, 34, 220});
        for (int row = 0; row < 3; ++row) {
            DrawRectangle(static_cast<int>(x + 5.0F + row * 10.0F),
                          static_cast<int>(horizon - buildingHeight + 10.0F),
                          3, 5, Color{72, 131, 157, 105});
        }
    }
}

void DrawRoad(const Game& game, int width, int height) {
    DrawBackground(width, height);
    const float horizon = height * 0.38F;
    const int steps = 44;
    for (int i = 0; i < steps; ++i) {
        const float aheadNear = kViewDistance * static_cast<float>(i) / steps;
        const float aheadFar = kViewDistance * static_cast<float>(i + 1) / steps;
        const float yNear = RoadY(aheadNear, horizon, static_cast<float>(height));
        const float yFar = RoadY(aheadFar, horizon, static_cast<float>(height));
        const float widthNear = RoadWidth(aheadNear, static_cast<float>(width));
        const float widthFar = RoadWidth(aheadFar, static_cast<float>(width));
        const float centerNear = RoadCenter(game.racers[0].distance + aheadNear,
                                            game.racers[0].distance, static_cast<float>(width));
        const float centerFar = RoadCenter(game.racers[0].distance + aheadFar,
                                           game.racers[0].distance, static_cast<float>(width));
        const Color roadColor = (i / 2) % 2 == 0 ? Color{44, 51, 61, 255} : Color{40, 47, 57, 255};
        const Color curbColor = (i / 2) % 2 == 0 ? Color{245, 246, 238, 255} : Color{251, 82, 91, 255};

        DrawTriangle({centerNear - widthNear * 0.55F, yNear},
                     {centerNear - widthNear * 0.5F, yNear},
                     {centerFar - widthFar * 0.5F, yFar}, curbColor);
        DrawTriangle({centerNear - widthNear * 0.55F, yNear},
                     {centerFar - widthFar * 0.5F, yFar},
                     {centerFar - widthFar * 0.55F, yFar}, curbColor);
        DrawTriangle({centerNear + widthNear * 0.5F, yNear},
                     {centerNear + widthNear * 0.55F, yNear},
                     {centerFar + widthFar * 0.55F, yFar}, curbColor);
        DrawTriangle({centerNear + widthNear * 0.5F, yNear},
                     {centerFar + widthFar * 0.55F, yFar},
                     {centerFar + widthFar * 0.5F, yFar}, curbColor);

        DrawTriangle({centerNear - widthNear * 0.5F, yNear},
                     {centerNear + widthNear * 0.5F, yNear},
                     {centerFar + widthFar * 0.5F, yFar}, roadColor);
        DrawTriangle({centerNear - widthNear * 0.5F, yNear},
                     {centerFar + widthFar * 0.5F, yFar},
                     {centerFar - widthFar * 0.5F, yFar}, roadColor);

        if ((i + static_cast<int>(game.racers[0].distance / 4.0F)) % 5 < 3) {
            for (float laneMark : {-1.0F / 3.0F, 1.0F / 3.0F}) {
                const float markNear = centerNear + widthNear * laneMark;
                const float markFar = centerFar + widthFar * laneMark;
                const float markSizeNear = std::max(1.0F, widthNear * 0.006F);
                const float markSizeFar = std::max(1.0F, widthFar * 0.006F);
                DrawTriangle({markNear - markSizeNear, yNear},
                             {markNear + markSizeNear, yNear},
                             {markFar + markSizeFar, yFar},
                             Color{221, 229, 233, 190});
                DrawTriangle({markNear - markSizeNear, yNear},
                             {markFar + markSizeFar, yFar},
                             {markFar - markSizeFar, yFar},
                             Color{221, 229, 233, 190});
            }
        }
    }
    DrawRectangle(0, static_cast<int>(horizon), width, 2, Color{153, 193, 214, 70});
}

void DrawCar(float x, float y, float scale, Color color, bool player) {
    const float carWidth = std::max(9.0F, 47.0F * scale);
    const float carHeight = std::max(15.0F, 78.0F * scale);
    const Rectangle body{x - carWidth * 0.5F, y - carHeight * 0.5F, carWidth, carHeight};
    DrawRectangleRounded({body.x - 3.0F * scale, body.y + carHeight * 0.25F,
                          body.width + 6.0F * scale, carHeight * 0.48F},
                         0.18F, 5, Color{0, 0, 0, 95});
    DrawRectangleRounded(body, 0.2F, 6, color);
    DrawRectangleRounded({body.x + carWidth * 0.17F, body.y + carHeight * 0.18F,
                          carWidth * 0.66F, carHeight * 0.28F},
                         0.26F, 5, Color{20, 34, 49, 255});
    DrawRectangle(static_cast<int>(body.x + carWidth * 0.12F),
                  static_cast<int>(body.y + carHeight * 0.76F),
                  static_cast<int>(carWidth * 0.22F), std::max(2, static_cast<int>(carHeight * 0.07F)),
                  Color{255, 84, 89, 255});
    DrawRectangle(static_cast<int>(body.x + carWidth * 0.66F),
                  static_cast<int>(body.y + carHeight * 0.76F),
                  static_cast<int>(carWidth * 0.22F), std::max(2, static_cast<int>(carHeight * 0.07F)),
                  Color{255, 84, 89, 255});
    if (player) {
        DrawRectangle(static_cast<int>(body.x + carWidth * 0.44F),
                      static_cast<int>(body.y + carHeight * 0.48F),
                      std::max(2, static_cast<int>(carWidth * 0.12F)),
                      static_cast<int>(carHeight * 0.23F), kWhite);
        DrawCircle(static_cast<int>(x), static_cast<int>(body.y - 7.0F * scale),
                   std::max(2.0F, 3.0F * scale), kCyan);
    }
}

void DrawRacers(const Game& game, int width, int height) {
    const float horizon = height * 0.38F;
    const float playerDistance = game.racers[0].distance;
    for (int i = 1; i < kRacerCount; ++i) {
        const Racer& racer = game.racers[static_cast<std::size_t>(i)];
        const float ahead = racer.distance - playerDistance;
        if (ahead < -16.0F || ahead > kViewDistance + 14.0F) {
            continue;
        }
        const float projectedAhead = std::max(0.0F, ahead);
        const float y = RoadY(projectedAhead, horizon, static_cast<float>(height));
        const float roadWidth = RoadWidth(projectedAhead, static_cast<float>(width));
        const float center = RoadCenter(playerDistance + ahead, playerDistance,
                                        static_cast<float>(width));
        const float x = center + racer.lane * roadWidth * 0.34F;
        const float scale = 0.26F + 0.74F * (1.0F - projectedAhead / kViewDistance);
        DrawCar(x, y, scale, racer.color, false);
        if (ahead > 18.0F && ahead < kViewDistance * 0.72F) {
            DrawText(racer.name.c_str(), static_cast<int>(x - 34.0F * scale),
                     static_cast<int>(y - 39.0F * scale), std::max(8, static_cast<int>(11.0F * scale)),
                     Color{231, 240, 246, 200});
        }
    }

    const float center = RoadCenter(playerDistance, playerDistance, static_cast<float>(width));
    const float playerX = center + game.racers[0].lane * RoadWidth(0.0F, static_cast<float>(width)) * 0.34F;
    DrawCar(playerX, height * 0.82F, 1.0F, kCars[static_cast<std::size_t>(game.selectedCar)].color, true);
}

void DrawTopPanel(const Game& game, int width) {
    DrawRectangle(20, 18, width - 40, 76, Color{7, 13, 22, 222});
    DrawRectangleLinesEx({20, 18, static_cast<float>(width - 40), 76}, 1.0F,
                         Color{73, 100, 122, 180});
    const Racer& player = game.racers[0];
    const int speed = static_cast<int>(player.speed);
    DrawText(TextFormat("%03d", speed), 42, 30, 36, kWhite);
    DrawText("MPH", 125, 48, 12, kMuted);
    DrawText(TextFormat("POS  %d / %d", game.playerPosition, kRacerCount),
             width / 2 - 62, 32, 19, kCyan);
    DrawText(TextFormat("%.0f%%", Clamp01(player.distance / kRaceLength) * 100.0F),
             width - 130, 32, 20, kWhite);
    DrawText("RACE DISTANCE", width - 130, 57, 10, kMuted);

    const Rectangle progress{width / 2.0F - 120.0F, 66.0F, 240.0F, 5.0F};
    DrawRectangleRec(progress, Color{56, 71, 84, 255});
    DrawRectangleRec({progress.x, progress.y,
                      progress.width * Clamp01(player.distance / kRaceLength), progress.height}, kCyan);

    DrawRectangle(20, 105, 154, 46, Color{7, 13, 22, 205});
    DrawText("NITRO", 32, 113, 10, kMuted);
    DrawRectangleRec({32, 132, 128, 7}, Color{51, 67, 82, 255});
    DrawRectangleRec({32, 132, 128.0F * Clamp01(game.nitro / 100.0F), 7}, kCyan);
    DrawText("SHIFT", 166, 127, 9, kMuted);

    DrawText("W / UP  ACCELERATE     A D / ARROWS  STEER     SPACE  DRIFT",
             24, GetScreenHeight() - 28, 12, Color{205, 217, 227, 210});
}

void DrawLeaderboard(const Game& game, int width) {
    std::array<int, kRacerCount> order{};
    for (int i = 0; i < kRacerCount; ++i) {
        order[static_cast<std::size_t>(i)] = i;
    }
    std::sort(order.begin(), order.end(), [&game](int left, int right) {
        return game.racers[static_cast<std::size_t>(left)].distance >
               game.racers[static_cast<std::size_t>(right)].distance;
    });

    const int panelWidth = 160;
    DrawRectangle(width - panelWidth - 20, 106, panelWidth, 164, Color{7, 13, 22, 208});
    DrawText("RACE ORDER", width - panelWidth - 8, 114, 11, kMuted);
    for (int rank = 0; rank < 4; ++rank) {
        const Racer& racer = game.racers[static_cast<std::size_t>(order[static_cast<std::size_t>(rank)])];
        const int rowY = 138 + rank * 29;
        DrawText(TextFormat("%d", rank + 1), width - panelWidth - 8, rowY, 15, kMuted);
        DrawCircle(width - panelWidth + 18, rowY + 8, 4, racer.color);
        DrawText(racer.name.c_str(), width - panelWidth + 29, rowY, 13,
                 racer.player ? kCyan : kWhite);
    }
}

void DrawLobby(Game& game, int width, int height) {
    DrawBackground(width, height);
    DrawRectangle(0, 0, width, height, Color{5, 10, 17, 125});
    DrawText("TURBO", 64, 46, 24, kCyan);
    DrawText("HORIZON", 64, 70, 50, kWhite);
    DrawText("CHAMPIONSHIP  //  STREET CIRCUIT", 66, 131, 13, kMuted);
    DrawRectangle(66, 158, 234, 2, kCyan);

    const int cardX = width / 2 - 330;
    const int cardY = height / 2 - 185;
    const Rectangle card{static_cast<float>(cardX), static_cast<float>(cardY), 660, 350};
    DrawRectangleRec(card, Color{9, 17, 27, 238});
    DrawRectangleLinesEx(card, 1.0F, Color{71, 102, 125, 255});
    DrawText("CHOOSE YOUR MACHINE", cardX + 28, cardY + 22, 14, kMuted);

    const CarSpec& car = kCars[static_cast<std::size_t>(game.selectedCar)];
    const int previewX = cardX + 330;
    const int previewY = cardY + 150;
    DrawCircle(previewX, previewY + 10, 83, Color{car.color.r, car.color.g, car.color.b, 18});
    DrawCar(static_cast<float>(previewX), static_cast<float>(previewY), 1.5F, car.color, true);
    DrawText(car.name, cardX + 40, cardY + 110, 30, kWhite);
    DrawText(car.className, cardX + 40, cardY + 149, 12, car.color);
    DrawText(car.description, cardX + 40, cardY + 178, 12, kMuted);

    const int statX = cardX + 40;
    const int statY = cardY + 223;
    const std::array<float, 4> values{{
        car.topSpeed / 260.0F, car.acceleration / 115.0F, car.handling / 1.5F, car.nitro / 1.2F}};
    const std::array<const char*, 4> labels{{"TOP SPEED", "LAUNCH", "HANDLING", "NITRO"}};
    for (int i = 0; i < 4; ++i) {
        const int x = statX + i * 145;
        DrawText(labels[static_cast<std::size_t>(i)], x, statY, 9, kMuted);
        DrawRectangle(x, statY + 20, 112, 6, Color{51, 67, 82, 255});
        DrawRectangle(x, statY + 20, static_cast<int>(112.0F * Clamp01(values[static_cast<std::size_t>(i)])),
                      6, car.color);
    }

    const Rectangle previous{static_cast<float>(cardX + 28), static_cast<float>(cardY + 285), 52, 42};
    const Rectangle next{static_cast<float>(cardX + 580), static_cast<float>(cardY + 285), 52, 42};
    if (Button(previous, "<", kCyan, 24) || IsKeyPressed(KEY_LEFT) || IsKeyPressed(KEY_A)) {
        game.selectedCar = (game.selectedCar + static_cast<int>(kCars.size()) - 1) %
                           static_cast<int>(kCars.size());
    }
    if (Button(next, ">", kCyan, 24) || IsKeyPressed(KEY_RIGHT) || IsKeyPressed(KEY_D)) {
        game.selectedCar = (game.selectedCar + 1) % static_cast<int>(kCars.size());
    }
    for (int i = 0; i < static_cast<int>(kCars.size()); ++i) {
        DrawCircle(cardX + 305 + i * 18, cardY + 306, 4,
                   i == game.selectedCar ? kCyan : Color{81, 102, 119, 255});
    }

    DrawText("6 DRIVERS  /  1 CHAMPION", 66, height - 108, 13, kMuted);
    DrawText("A winding sprint through the neon skyline.", 66, height - 82, 15, kWhite);
    const Rectangle start{static_cast<float>(width - 282), static_cast<float>(height - 116), 216, 58};
    if (Button(start, "START RACE  >", kCyan, 17) ||
        IsKeyPressed(KEY_ENTER) || IsKeyPressed(KEY_SPACE)) {
        game.screen = Screen::Racing;
        game.paused = false;
        game.raceTime = 0.0F;
        game.nitro = 100.0F * car.nitro;
        game.driftScore = 0.0F;
        game.collisionCooldown = 0.0F;
        game.finishFlash = 0.0F;
        game.playerPosition = 1;

        game.racers[0] = {"YOU", car.color, 0.0F, 0.0F, 0.0F, 0.0F, 1.0F, 0.0F, 0.0F, true, false};
        const std::array<const char*, 5> names{{"ACE", "KIRA", "BOLT", "JADE", "REX"}};
        const std::array<Color, 5> colors{{
            {255, 98, 120, 255}, {255, 197, 81, 255}, {166, 133, 255, 255},
            {111, 240, 174, 255}, {247, 247, 242, 255}}};
        const std::array<float, 5> skills{{0.92F, 0.75F, 0.83F, 0.69F, 0.78F}};
        const std::array<float, 5> startingLanes{{-0.84F, -0.42F, 0.42F, 0.84F, -0.66F}};
        for (int i = 1; i < kRacerCount; ++i) {
            const float lane = startingLanes[static_cast<std::size_t>(i - 1)];
            game.racers[static_cast<std::size_t>(i)] = {
                names[static_cast<std::size_t>(i - 1)],
                colors[static_cast<std::size_t>(i - 1)],
                0.0F,
                0.0F,
                lane,
                lane,
                skills[static_cast<std::size_t>(i - 1)],
                1.8F + static_cast<float>(i) * 0.37F,
                0.0F,
                false,
                false};
        }
    }
}

void UpdateRace(Game& game, float dt) {
    if (IsKeyPressed(KEY_ESCAPE) || IsKeyPressed(KEY_P)) {
        game.paused = !game.paused;
    }
    if (game.paused) {
        return;
    }

    game.raceTime += dt;
    game.collisionCooldown = std::max(0.0F, game.collisionCooldown - dt);
    game.finishFlash = std::max(0.0F, game.finishFlash - dt);
    Racer& player = game.racers[0];
    const CarSpec& car = kCars[static_cast<std::size_t>(game.selectedCar)];

    const bool accelerate = IsKeyDown(KEY_W) || IsKeyDown(KEY_UP);
    const bool brake = IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN);
    const bool left = IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT);
    const bool right = IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT);
    const bool drifting = IsKeyDown(KEY_SPACE) && (left || right);
    const bool boosting = (IsKeyDown(KEY_LEFT_SHIFT) || IsKeyDown(KEY_RIGHT_SHIFT)) && game.nitro > 0.0F;

    if (accelerate) {
        player.speed += car.acceleration * dt;
    } else {
        player.speed -= (brake ? 175.0F : 38.0F) * dt;
    }
    if (boosting) {
        player.speed += 92.0F * dt;
        game.nitro = std::max(0.0F, game.nitro - 35.0F * dt);
    } else {
        game.nitro = std::min(100.0F * car.nitro, game.nitro + 5.5F * dt);
    }
    const float speedLimit = car.topSpeed + (boosting ? 45.0F : 0.0F);
    player.speed = std::clamp(player.speed, 0.0F, speedLimit);

    const float steerInput = (right ? 1.0F : 0.0F) - (left ? 1.0F : 0.0F);
    player.lane += steerInput * car.handling * (0.55F + player.speed / 190.0F) * dt;
    player.lane = std::clamp(player.lane, -1.08F, 1.08F);
    if (drifting) {
        game.driftScore += player.speed * dt * 0.16F;
    }
    player.distance += player.speed * 0.19F * dt;

    for (int i = 1; i < kRacerCount; ++i) {
        Racer& racer = game.racers[static_cast<std::size_t>(i)];
        if (racer.finished) {
            continue;
        }
        racer.laneTimer -= dt;
        if (racer.laneTimer <= 0.0F) {
            const float phase = std::sin(game.raceTime * (0.5F + racer.skill) + i * 3.7F);
            racer.targetLane = std::clamp(phase * 0.72F, -0.88F, 0.88F);
            racer.laneTimer = 1.1F + static_cast<float>((i * 7) % 9) * 0.16F;
        }
        const float rivalTopSpeed = 190.0F + racer.skill * 47.0F;
        racer.speed = std::min(rivalTopSpeed, racer.speed + (72.0F + racer.skill * 24.0F) * dt);
        racer.lane += (racer.targetLane - racer.lane) * std::min(1.0F, dt * 1.35F);
        racer.distance += racer.speed * 0.19F * dt;
        if (racer.distance >= kRaceLength) {
            racer.distance = kRaceLength;
            racer.finished = true;
            racer.finishTime = game.raceTime;
        }

        const float distanceGap = std::abs(racer.distance - player.distance);
        const float laneGap = std::abs(racer.lane - player.lane);
        if (distanceGap < 7.0F && laneGap < 0.29F && game.collisionCooldown <= 0.0F) {
            player.speed *= 0.70F;
            player.lane += player.lane <= racer.lane ? -0.18F : 0.18F;
            player.lane = std::clamp(player.lane, -1.08F, 1.08F);
            game.collisionCooldown = 0.85F;
            game.finishFlash = 0.28F;
        }
    }

    game.playerPosition = 1;
    for (int i = 1; i < kRacerCount; ++i) {
        if (game.racers[static_cast<std::size_t>(i)].distance > player.distance) {
            ++game.playerPosition;
        }
    }
    if (player.distance >= kRaceLength) {
        player.distance = kRaceLength;
        player.finished = true;
        player.finishTime = game.raceTime;
        game.screen = Screen::Results;
    }
}

void DrawRace(Game& game, int width, int height) {
    DrawRoad(game, width, height);
    DrawRacers(game, width, height);
    DrawTopPanel(game, width);
    DrawLeaderboard(game, width);

    if (game.finishFlash > 0.0F) {
        DrawRectangle(0, 0, width, height,
                      Color{255, 255, 255, static_cast<unsigned char>(game.finishFlash * 110.0F)});
    }
    if (game.paused) {
        DrawRectangle(0, 0, width, height, Color{3, 7, 12, 190});
        DrawCentered("RACE PAUSED", height / 2 - 44, 34, kWhite);
        DrawCentered("P / ESC TO RESUME     R TO RESTART", height / 2 + 12, 14, kCyan);
        if (IsKeyPressed(KEY_R)) {
            game.screen = Screen::Lobby;
            game.paused = false;
        }
    }
}

void DrawResults(Game& game, int width, int height) {
    DrawBackground(width, height);
    DrawRectangle(0, 0, width, height, Color{4, 9, 16, 185});
    DrawCentered("FINISH LINE", height / 2 - 200, 15, kCyan);
    DrawCentered(game.playerPosition == 1 ? "CHAMPION" : "RACE COMPLETE",
                 height / 2 - 154, 46, kWhite);
    DrawCentered(TextFormat("%d%s PLACE", game.playerPosition,
                            game.playerPosition == 1 ? "ST" :
                            game.playerPosition == 2 ? "ND" :
                            game.playerPosition == 3 ? "RD" : "TH"),
                 height / 2 - 87, 22, kOrange);
    DrawCentered(TextFormat("FINISH TIME   %02d:%05.2f",
                            static_cast<int>(game.raceTime / 60.0F),
                            std::fmod(game.raceTime, 60.0F)),
                 height / 2 - 48, 17, kMuted);
    DrawCentered(TextFormat("DRIFT SCORE   %05.0f", game.driftScore),
                 height / 2 - 18, 14, kCyan);
    const Rectangle again{width / 2.0F - 125.0F, height / 2.0F + 36.0F, 250.0F, 54.0F};
    if (Button(again, "BACK TO GARAGE", kCyan, 16) ||
        IsKeyPressed(KEY_ENTER) || IsKeyPressed(KEY_SPACE)) {
        game.screen = Screen::Lobby;
    }
}

} // namespace

int main() {
    SetConfigFlags(FLAG_WINDOW_RESIZABLE | FLAG_MSAA_4X_HINT);
    InitWindow(1440, 900, "Turbo Horizon - C++ Street Racer");
    SetExitKey(KEY_NULL);
    SetTargetFPS(60);

    Game game;
    while (!WindowShouldClose()) {
        const float dt = std::min(GetFrameTime(), 1.0F / 30.0F);
        const int width = GetScreenWidth();
        const int height = GetScreenHeight();

        if (game.screen == Screen::Racing) {
            UpdateRace(game, dt);
        }

        BeginDrawing();
        ClearBackground(kInk);
        switch (game.screen) {
        case Screen::Lobby:
            DrawLobby(game, width, height);
            break;
        case Screen::Racing:
            DrawRace(game, width, height);
            break;
        case Screen::Results:
            DrawResults(game, width, height);
            break;
        }
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
